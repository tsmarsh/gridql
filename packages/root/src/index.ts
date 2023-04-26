import {Collection} from "mongodb"
import {DependencyResolver, DTOConfiguration, QueryResolver} from "./types/dtoconfig.schema";

const {assignResolver} = require("./resolvers")

//Putting ObjectId is scope so it can be used in queries
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
    resolvers = {} as any

    constructor(config?: Record<string, DependencyResolver>) {

        if (config !== undefined) {
            for (const name in config) {
                const res = config[name];
                this.resolvers[name] = assignResolver(
                    res.id,
                    res.queryName,
                    res.url)
            }
        }
    }

    fillOne(data: any) {
        let copy = {} as any;

        for (const f in this.resolvers) {
            if (typeof this.resolvers[f] === 'function') {
                let resolver = this.resolvers[f];
                copy[f] = resolver.bind(copy);
            }
        }

        assignProperties(copy, data)
        return copy
    }

    fillMany(data: Array<any>) {
        return data.map((d) => this.fillOne(d))
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
    return async ({id: id}: any) => {
        const query = processQueryTemplate(id, queryTemplate)
        const result = await db.findOne(query).catch(e => console.log(e));
        if (result === null) {
            console.log(`Nothing found for: ${id}`);
            return result;
        } else {
            let graphdto = dtoFactory.fillOne(result);
            return graphdto;
        }
    }
}
