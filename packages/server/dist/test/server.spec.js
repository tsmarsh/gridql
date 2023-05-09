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
const mongodb_memory_server_1 = require("mongodb-memory-server");
const chai_1 = require("chai");
const server_1 = require("../src/server");
const mongodb_1 = require("mongodb");
const src_1 = require("@tsmarsh/callgraph/src");
describe('GraphQL Server', () => {
    let mongod;
    let uri;
    let config;
    let server;
    let db;
    before(function () {
        return __awaiter(this, void 0, void 0, function* () {
            mongod = yield mongodb_memory_server_1.MongoMemoryServer.create({ instance: { port: 60219 } });
            let client = new mongodb_1.MongoClient(mongod.getUri());
            yield client.connect();
            db = client.db("test").collection("test");
            config = yield (0, server_1.init)(__dirname + "/simple.json");
            server = (0, server_1.start)(config.port, config.graphlettes);
            uri = mongod.getUri();
        });
    });
    after(function () {
        return __awaiter(this, void 0, void 0, function* () {
            mongod.stop();
        });
    });
    it('should build a simple server', () => __awaiter(void 0, void 0, void 0, function* () {
        const result = yield db.insertOne({ foo: "bar", eggs: 11 });
        const query = `{
         getById(id: "${result === null || result === void 0 ? void 0 : result.insertedId}") {
               eggs
            }
        }`;
        const json = yield (0, src_1.callSubgraph)("http://localhost:40000/test", query, "getById");
        (0, chai_1.expect)(json.eggs).to.equal(11);
    }));
});
