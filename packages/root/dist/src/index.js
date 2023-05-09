"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.singleton = exports.scalar = exports.DTOFactory = exports.root = exports.context = void 0;
const { assignResolver } = require("./resolvers");
//Putting ObjectId is scope so it can be used in queries
const { ObjectId } = require("mongodb");
const assignProperties = (target, source) => {
    Object.keys(source).forEach((key) => {
        target[key] = source[key];
    });
};
const context = (db, config) => {
    let dtoF = new DTOFactory(config.resolvers);
    let rt = (0, exports.root)(db, dtoF, config);
    return {
        dtoFactory: dtoF,
        root: rt
    };
};
exports.context = context;
const root = (db, dtoFactory, { singletons, scalars }) => {
    let base = {};
    if (singletons !== undefined) {
        for (const s in singletons) {
            const nonce = singletons[s];
            base[s] = (0, exports.singleton)(db, dtoFactory, nonce.id, nonce.query);
        }
    }
    if (scalars !== undefined) {
        for (const s in scalars) {
            const resolver = scalars[s];
            base[s] = (0, exports.scalar)(db, dtoFactory, resolver.id, resolver.query);
        }
    }
    return base;
};
exports.root = root;
class DTOFactory {
    constructor(config) {
        this.resolvers = {};
        if (config !== undefined) {
            for (const name in config) {
                const res = config[name];
                this.resolvers[name] = assignResolver(res.id, res.queryName, res.url);
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
        assignProperties(copy, data);
        return copy;
    }
    fillMany(data) {
        return data.map((d) => this.fillOne(d));
    }
}
exports.DTOFactory = DTOFactory;
const processQueryTemplate = (id, queryTemplate) => {
    console.log(`Id used: ${id}`);
    const queryWithId = queryTemplate.replace("${id}", id);
    //TODO: Should only run eval on start up, not on each request
    return eval(queryWithId);
};
const scalar = (db, dtoFactory, i = "id", queryTemplate) => {
    return (vars) => __awaiter(void 0, void 0, void 0, function* () {
        const id = vars[i];
        const query = processQueryTemplate(id, queryTemplate);
        const results = yield db.find(query).toArray();
        return dtoFactory.fillMany(results);
    });
};
exports.scalar = scalar;
const singleton = (db, dtoFactory, id = "id", queryTemplate) => {
    return ({ id: id }) => __awaiter(void 0, void 0, void 0, function* () {
        const query = processQueryTemplate(id, queryTemplate);
        const result = yield db.findOne(query).catch(e => console.log(e));
        if (result === null) {
            console.log(`Nothing found for: ${id}`);
            return result;
        }
        else {
            let graphdto = dtoFactory.fillOne(result);
            return graphdto;
        }
    });
};
exports.singleton = singleton;
