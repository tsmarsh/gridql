import {MongoMemoryServer} from "mongodb-memory-server";
import {MongoClient, Db, Collection} from "mongodb";

const {context} = require("../src");
import {DTOConfiguration} from "../src/types/dtoconfig.schema";
import {fail} from "assert";

const {graphql, buildSchema} = require("graphql");
const {before, describe, it} = require("mocha");
const assert = require("assert");

let db: Collection;
let test_db = "test_db";
let mongo_collection = "simple";

before(async function () {
    const mongod = await MongoMemoryServer.create();

    const uri = mongod.getUri();

    const client = new MongoClient(uri);

    await client.connect();

    const connection: Db = client.db(test_db);
    db = connection.collection(mongo_collection);
});

describe("Generating a simple root", () => {
    const simple: DTOConfiguration = {
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

        const foo = await db.findOne({"_id": result.insertedId});

        const response = await graphql({schema, source: query, rootValue: root});

        if (response.hasOwnProperty("errors")) {
            console.log(response.errors?.[0].message);
            fail();
        } else {
            assert.equal(11, response.data?.getById.eggs);
        }

    });
});
