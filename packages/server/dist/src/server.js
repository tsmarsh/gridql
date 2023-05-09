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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.start = exports.init = void 0;
const express_1 = __importDefault(require("express"));
const express_graphql_1 = require("express-graphql");
const graphql_1 = require("graphql");
const fs_1 = __importDefault(require("fs"));
const src_1 = require("@tsmarsh/root/src");
const mongodb_1 = require("mongodb");
const jsonschema_1 = require("jsonschema");
const serverConfigSchema = JSON.parse(fs_1.default.readFileSync(__dirname + "/../schemas/serverConfig.schema.json").toString());
const validator = new jsonschema_1.Validator();
function buildDb(mongo) {
    return __awaiter(this, void 0, void 0, function* () {
        let client = new mongodb_1.MongoClient(mongo.uri);
        yield client.connect();
        let db = client.db(mongo.db).collection(mongo.collection);
        return db;
    });
}
const init = (configFile) => __awaiter(void 0, void 0, void 0, function* () {
    const config = require(configFile);
    const port = config.port;
    let graphlettes = yield Promise.all(config.graphlettes.map(({ mongo, dtoConfig, schema, path }) => __awaiter(void 0, void 0, void 0, function* () {
        let db = yield buildDb(mongo);
        let { root } = (0, src_1.context)(db, dtoConfig);
        console.log('Current directory:', process.cwd());
        let sch = fs_1.default.readFileSync(schema).toString();
        const graphSchema = (0, graphql_1.buildSchema)(sch);
        return { path, graph: { schema: graphSchema, root } };
    })));
    return { port, graphlettes };
});
exports.init = init;
const start = (port, graphlettes) => __awaiter(void 0, void 0, void 0, function* () {
    const app = (0, express_1.default)();
    for (let { path, graph } of graphlettes) {
        console.log("Setting up: " + path);
        let route = yield (0, express_graphql_1.graphqlHTTP)({
            schema: graph.schema,
            rootValue: graph.root,
            graphiql: true,
            customFormatErrorFn: (error) => {
                console.log(error);
                return error;
            }
        });
        app.use(path, route);
    }
    app.listen(port, () => {
        console.log(`Server is running at http://localhost:${port}`);
    });
    return app;
});
exports.start = start;
