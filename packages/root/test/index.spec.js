const {MongoMemoryServer} = require("mongodb-memory-server");
const {MongoClient } = require("mongodb");

const {context} = require("../");

const {graphql, buildSchema} = require("graphql");
const {expect} = require("chai");
const sinon = require("sinon");

const assert = require("assert");

let db;
let test_db = "test_db";
let mongo_collection = "simple";

before(async function () {
    const mongod = await MongoMemoryServer.create();

    const uri = mongod.getUri();

    const client = new MongoClient(uri);

    await client.connect();

    const connection = client.db(test_db);
    db = connection.collection(mongo_collection);
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

    const schema = buildSchema(
        `type Test {
          foo: String
          eggs: Int
        }
        type Query {
          getById(id: String): Test
        }`);

    it("should create a simple root", async () => {
        const result = await db.insertOne({foo: "bar", eggs: 11});

        const query = `{
         getById(id: "${result?.insertedId}") {
               eggs
            }
        }`;

        const {root} = context(db, simple);

        const response = await graphql({schema, source: query, rootValue: root});

        if (response.hasOwnProperty("errors")) {
            console.log(response.errors?.[0].message);
            fail();
        } else {
            assert.equal(11, response.data?.getById.eggs);
        }

    });
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

    const schema = buildSchema(
        `type Test {
          name: String
          eggs: Int
          breed: String
        }
        type Query {
          getById(id: String): Test
          getByBreed(breed: String): [Test]
        }`);

    it("should create a simple scalr root", async () => {
        await Promise.all([
            db.insertOne({name: "henry", eggs: 11, breed: "chicken"}),
            db.insertOne({name: "harry", eggs: 7, breed: "chicken"}),
            db.insertOne({name: "quack", eggs: 2, breed: "duck"})
        ]);

        const query = `{
         getByBreed(breed: "chicken") {
               name
            }
        }`;

        const {root} = context(db, scalar);

        const response = await graphql({schema, source: query, rootValue: root});

        if (response.hasOwnProperty("errors")) {
            console.log(response.errors?.[0].message);
            assert.fail();
        } else {
            expect(response.data?.getByBreed.map((d) => d["name"])).to.include.members(["henry", "harry"]);
        }

    });
});

describe("Generating a simple scalar root with a dependency", () => {
    afterEach(() => {
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

    const schema = buildSchema(
        `
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


    it("should call the dependency", async () => {
        sinon.stub(global, 'fetch')
            .resolves({json: () => Promise.resolve({data: {getById: {name: "mega"}}})});

        const result = await db.insertOne({name: "chucky", eggs: 1, coop_id: "101010"});

        const query = `{
         getById(id: "${result?.insertedId}") {
               name, coop {name}
            }
        }`;

        const {root} = context(db, simple);

        const response = await graphql({schema, source: query, rootValue: root});

        if (response.hasOwnProperty("errors")) {
            console.log(response.errors?.[0].message);
            assert.fail();
        } else {
            assert.equal("mega", response.data?.getById.coop.name);
        }
    });
});
