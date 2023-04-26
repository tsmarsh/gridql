const {callSubgraph, processContext} = require("subgraph/src");
import {Collection} from "mongodb"
import {DependencyResolver, DTOConfiguration, QueryResolver} from "./types/dtoconfig.schema";
import {GraphQLResolveInfo} from "graphql"
const {ObjectId} = require("mongodb");

const assignProperties = (target: any, source: any) => {
    Object.keys(source).forEach((key: string) => {
        target[key] = source[key];
    });
}

export const context = (db: Collection, config: DTOConfiguration) => {
    let dtoF = new DTOFactory(config.resolvers);
    let rt = root(db, dtoF, config);

    return {
        dtoFactory: dtoF,
        root: rt
    };
}

export const root = (db: Collection, dtoFactory: DTOFactory,
                     {singletons, scalars}: DTOConfiguration) => {
    let base = {} as any;

    if (singletons !== undefined) {
        for (const s in singletons) {
            const nonce: QueryResolver = singletons[s];
            base[s] = singleton(db, dtoFactory, nonce.id, nonce.query)
        }
    }

    if (scalars !== undefined) {
        for (const s in scalars) {
            const resolver = scalars[s];
            base[s] = scalar(db, dtoFactory, resolver.id, resolver.query)
        }
    }

    return base;
}

export class DTOFactory {
    dto = {} as any

    constructor(resolvers?: Record<string, DependencyResolver>) {

        if (resolvers !== undefined) {
            for (const resolver in resolvers) {
                const res = resolvers[resolver];
                this.dto[resolver] = assignResolver(
                    res.id,
                    res.queryName,
                    res.url,
                    this.dto)
            }
        }
    }

    fillOne(data: any) {
        let copy = {...this.dto}
        assignProperties(copy, data)
        return copy
    }

    fillMany(data: Array<any>) {
        return data.map((d) => this.fillOne(d))
    }
}


export const assignResolver = (id: string = "id", queryName: string, url: string, self: any) => {
    return async (parent: any, args: any, context: any, info: GraphQLResolveInfo) => {
        const query = processContext(self[id], info, queryName);
        return callSubgraph(url, query, queryName);
    }
}

const processQueryTemplate = (id: string, queryTemplate: string) => {
    console.log(`Id used: ${id}`)
    const queryWithId = queryTemplate.replace("${id}", id);
    //TODO: Should only run eval on start up, not on each request
    return eval(queryWithId);
}

export const scalar = (db: Collection, dtoFactory: DTOFactory, i: string = "id", queryTemplate: string) => {
    return async (vars: any) => {
        const id = vars[i]
        const query = processQueryTemplate(id, queryTemplate)
        const results = await db.find(query).toArray();
        return dtoFactory.fillMany(results);
    }
}

export const singleton = (db: Collection, dtoFactory: DTOFactory, id: string = "id", queryTemplate: string) => {
    return async ({id: id} : any) => {
        const query = processQueryTemplate(id, queryTemplate)
        const result = await db.findOne(query).catch(e => console.log(e));
        if (result === null) {
            console.log(`Nothing found for: ${id}`);
            return result;
        } else {
            return dtoFactory.fillOne(result);
        }
    }
}
