import { expect } from 'chai';
import {MongoMemoryServer} from "mongodb-memory-server";
import {MongoClient} from "mongodb";

before(async function () {
   this.mongod = await MongoMemoryServer.create();

   this.uri = this.mongod.getUri();

   this.client = new MongoClient(this.uri);

   this.client.connect()

   this.test_db = "test_db";
   this.mongo_collection = "rest_test"
   this.db = this.client.db(this.test_db).collection(this.mongo_collection);
});

describe("Generating a simple root", () => {
   it('should create a simple root', () => {
      const simple = {
         "singletons": {
            "getById": {
               "kind": "singleton",
               "id": "id",
               "query": "{'id': ${id}}"
            }
         }

         dtoFactory
      }


   })
});