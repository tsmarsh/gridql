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
const mongodb_memory_server_1 = require("mongodb-memory-server");
const mongodb_1 = require("mongodb");
const { context } = require("../src");
const assert_1 = require("assert");
const node_test_1 = __importDefault(require("node:test"));
const { graphql, buildSchema } = require("graphql");
const { before, describe, it } = require("mocha");
const { expect } = require("chai");
const sinon = require("sinon");
const assert = require("assert");
let db;
let test_db = "test_db";
let mongo_collection = "simple";
before(function () {
    return __awaiter(this, void 0, void 0, function* () {
        const mongod = yield mongodb_memory_server_1.MongoMemoryServer.create();
        const uri = mongod.getUri();
        const client = new mongodb_1.MongoClient(uri);
        yield client.connect();
        const connection = client.db(test_db);
        db = connection.collection(mongo_collection);
    });
});
describe("Generating a simple root", () => {
    const simple = {
        singletons: {
            getById: {
                id: "id",
                query: '{_id: new ObjectId("${id}")}',
            },
        },
    };
    const schema = buildSchema(`type Test {
          foo: String
          eggs: Int
        }
        type Query {
          getById(id: String): Test
        }`);
    it("should create a simple root", () => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        const result = yield db.insertOne({ foo: "bar", eggs: 11 });
        const query = `{
         getById(id: "${result === null || result === void 0 ? void 0 : result.insertedId}") {
               eggs
            }
        }`;
        const { root } = context(db, simple);
        const response = yield graphql({ schema, source: query, rootValue: root });
        if (response.hasOwnProperty("errors")) {
            console.log((_a = response.errors) === null || _a === void 0 ? void 0 : _a[0].message);
            (0, assert_1.fail)();
        }
        else {
            assert.equal(11, (_b = response.data) === null || _b === void 0 ? void 0 : _b.getById.eggs);
        }
    }));
});
describe("Generating a simple scalar root", () => {
    const scalar = {
        singletons: {
            getById: {
                id: "id",
                query: '{_id: new ObjectId("${id}")}',
            },
        },
        scalars: {
            getByBreed: {
                id: "breed",
                query: '({breed: "${id}"})',
            }
        }
    };
    const schema = buildSchema(`type Test {
          name: String
          eggs: Int
          breed: String
        }
        type Query {
          getById(id: String): Test
          getByBreed(breed: String): [Test]
        }`);
    it("should create a simple scalr root", () => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        yield Promise.all([
            db.insertOne({ name: "henry", eggs: 11, breed: "chicken" }),
            db.insertOne({ name: "harry", eggs: 7, breed: "chicken" }),
            db.insertOne({ name: "quack", eggs: 2, breed: "duck" })
        ]);
        const query = `{
         getByBreed(breed: "chicken") {
               name
            }
        }`;
        const { root } = context(db, scalar);
        const response = yield graphql({ schema, source: query, rootValue: root });
        if (response.hasOwnProperty("errors")) {
            console.log((_a = response.errors) === null || _a === void 0 ? void 0 : _a[0].message);
            (0, assert_1.fail)();
        }
        else {
            expect((_b = response.data) === null || _b === void 0 ? void 0 : _b.getByBreed.map((d) => d["name"])).to.include.members(["henry", "harry"]);
        }
    }));
});
describe("Generating a simple scalar root with a dependency", () => {
    (0, node_test_1.default)(() => {
        sinon.restore();
    });
    const simple = {
        singletons: {
            getById: {
                id: "id",
                query: '{_id: new ObjectId("${id}")}'
            },
        },
        resolvers: {
            coop: {
                id: "coop_id",
                queryName: "getById",
                url: "http://localhost:3000"
            }
        }
    };
    const schema = buildSchema(`
        type Coop {
            name: String
        }
        type Test {
          name: String
          eggs: Int
          coop: Coop
        }
        type Query {
          getById(id: String): Test
        }`);
    it("should call the dependency", () => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        sinon.stub(global, 'fetch')
            .resolves({ json: () => Promise.resolve({ data: { getById: { name: "mega" } } }) });
        const result = yield db.insertOne({ name: "chucky", eggs: 1, coop_id: "101010" });
        const query = `{
         getById(id: "${result === null || result === void 0 ? void 0 : result.insertedId}") {
               name, coop {name}
            }
        }`;
        const { root } = context(db, simple);
        const response = yield graphql({ schema, source: query, rootValue: root });
        if (response.hasOwnProperty("errors")) {
            console.log((_a = response.errors) === null || _a === void 0 ? void 0 : _a[0].message);
            (0, assert_1.fail)();
        }
        else {
            assert.equal("mega", (_b = response.data) === null || _b === void 0 ? void 0 : _b.getById.coop.name);
        }
    }));
});
