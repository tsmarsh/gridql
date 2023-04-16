import {callSubgraph, processContext} from "subgraph/src";
import {Collection} from "mongodb"
import {DTOConfiguration} from "./types/dtoconfig.schema";

const assignProperties = (target: any, source: any) => {
    Object.keys(source).forEach((key: string) => {
        target[key] = source[key];
    });
}

const context = (db: Collection, config: DTOConfiguration) => {
    let dtoF = new DTOFactory(config);
    let rt = new Root(db, dtoF, config);

    return {
        dtoFactory: dtoF,
        root: rt
    }
}

export class Root {
    constructor(db:Collection, dtoFactory: DTOFactory, {singletons, scalars}: DTOConfiguration) {
        for (const s in singletons) {
            this[s] = singleton(db, dtoFactory, singletons[s].id, singletons[s].query)
        }

        for (const s in scalars) {
            this[s] = scalar(db,dtoFactory, scalars[s].id, scalars[s].query)
        }
    }
}

export class DTOFactory {
    dto = {}

    constructor({resolvers}: DTOConfiguration) {
        for (const resolver in resolvers) {
            const res = resolvers[resolver];
            this.dto[resolver] = assignResolver(
                res.id,
                res.queryName,
                res.url)
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


export const assignResolver = (id: string = "id", queryName: string, url: string) => {
    return async (obj, req, context) => {
        const query = processContext(this[id], context, queryName);
        return callSubgraph(url, query, queryName);
    }
}

export const scalar = (db: Collection, dtoFactory: DTOFactory, id: string, query: any) => {
    return async ({id: id}) => {
        console.log(`Id used: ${id}`)
        const results = await db.find(query).toArray();
        return dtoFactory.fillMany(results);
    }
}

export const singleton = (db: Collection, dtoFactory: DTOFactory, id: string, query: any) => {
    return async ({id: id}) => {
        console.log(`Get by id: ${id}`);
        const result = await db.findOne(query).catch(e => console.log(e));
        if (result === null) {
            console.log(`Nothing found for: ${id}`);
            return result;
        } else {
            return dtoFactory.fillOne(result);
        }
    }
}
