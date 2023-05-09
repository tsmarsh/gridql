const {processContext} = require("@tsmarsh/subgraph");
const {callSubgraph} = require("@tsmarsh/callgraph");

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
        for (const s in singletons) {
            const nonce = singletons[s];
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

class DTOFactory {
    resolvers = {}

    constructor(config) {

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

    fillOne(data) {
        let copy = {};

        for (const f in this.resolvers) {
            if (typeof this.resolvers[f] === 'function') {
                let resolver = this.resolvers[f];
                copy[f] = resolver.bind(copy);
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