import {MongoMemoryServer} from "mongodb-memory-server";
import {MongoClient, Db, Collection} from "mongodb";
import {context} from "../src"
import {DTOConfiguration} from "../src/types/dtoconfig.schema";
import {graphql, buildSchema} from "graphql"
import assert from "assert"
import {before, describe, it} from "mocha"

let db: Collection;
let test_db = "test_db";
let mongo_collection = "simple"

before(async function () {
   const mongod = await MongoMemoryServer.create();

   const uri = this.mongod.getUri();

   const client = new MongoClient(this.uri);

   await client.connect();



   const connection: Db = client.db(test_db);
   db = connection.collection(mongo_collection);
});

describe("Generating a simple root", async () => {
   const simple: DTOConfiguration = {
      "singletons": {
         "getById": {
            "id": "id",
            "query": "{'_id': ${id}}"
         }
      }
   };

   const schema = buildSchema(`{
        type Test {
          foo: String
          eggs: Int
        }
        type Query {
          getById(id: String): Test
        }
      }`);

   const result = await db.insertOne({"foo": "bar", "eggs": 11});

   const query: string = `{
         getById(id: ${result?.insertedId}) {
               eggs
            }
      }`

   const {root} = context(db, simple);

   it('should create a simple root', async () => {
      const response = await graphql({schema, source: query, rootValue: root});
      assert.equal(11, response.data?.eggs);
   })
});