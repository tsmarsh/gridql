const {processContext} = require("./subgraph");
const {callSubgraph} = require("./callgraph");

const assignResolver = (id= "id", queryName, url) => {
    return async function(parent, args, context) {
        let foreignKey = this[id];
        const query = processContext(foreignKey, context, queryName);
        return callSubgraph(url, query, queryName);
    }
}

//Putting ObjectId is scope so it can be used in queries
const {ObjectId} = require("mongodb");

const assignProperties = (target, source) => {
    Object.keys(source).forEach((key) => {
        target[key] = source[key];
    });
}

const context = (db, config) => {
    let dtoF = new DTOFactory(config.resolvers);
    let rt = root(db, dtoF, config);

    return {
        dtoFactory: dtoF,
        root: rt
    };
}

const root = (db, dtoFactory,
                     {singletons, scalars}) => {
    let base = {};

    if (singletons !== undefined) {
        for (const s of singletons) {
            base[s.name] = singleton(db, dtoFactory, s.id, s.query)
        }
    }

    if (scalars !== undefined) {
        for (const s of scalars) {
            base[s.name] = scalar(db, dtoFactory, s.id, s.query)
        }
    }

    return base;
}

class DTOFactory {
    resolvers = {}

    constructor(config) {

        if (config !== undefined) {
            for (const c of config) {
                this.resolvers[c.name] = assignResolver(
                    c.id,
                    c.queryName,
                    c.url)
            }
        }
    }

    fillOne(data) {
        let copy = {};

        for (const f in this.resolvers) {
            if (typeof this.resolvers[f] === 'function') {
                copy[f] = this.resolvers[f];
            }
        }

        assignProperties(copy, data)
        return copy
    }

    fillMany(data) {
        return data.map((d) => this.fillOne(d))
    }
}

const processQueryTemplate = (id, queryTemplate) => {
    console.log(`Id used: ${id}`)
    const queryWithId = queryTemplate.replace("${id}", id);
    //TODO: Should only run eval on start up, not on each request
    return eval(queryWithId);
}

const scalar = (db, dtoFactory, i = "id", queryTemplate) => {
    return async (vars) => {
        const id = vars[i]
        const query = processQueryTemplate(id, queryTemplate)
        const results = await db.find(query).toArray();
        return dtoFactory.fillMany(results);
    }
}

const singleton = (db, dtoFactory, id = "id", queryTemplate) => {
    return async ({id: id}) => {
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

module.exports = {
    singleton,
    scalar,
    DTOFactory,
    root,
    context,
    assignResolver
}