import { MongoMemoryServer } from "mongodb-memory-server";

import { MongoClient } from "mongodb";

import { context } from "../lib/root.js";

import { buildSchema, graphql } from "graphql";

import { expect } from "chai";

import assert from "assert";

import fetchMock from "fetch-mock";
import { after, before, describe, it } from "mocha";
import { JWTSubAuthorizer } from "@gridql/auth";

let db;
let test_db = "test_db";
let mongo_collection = "simple";
let mongod;
let createdAt = new Date();

before(async function () {
  mongod = await MongoMemoryServer.create();

  const uri = mongod.getUri();

  const client = new MongoClient(uri);

  await client.connect();

  const connection = client.db(test_db);
  db = connection.collection(mongo_collection);
});

after(async function () {
  mongod.stop();
});

describe("GraphQL Configuration", function () {
  describe("Generating a simple root", () => {
    const simple = {
      singletons: [
        {
          name: "getById",
          id: "id",
          query: '{"id": "{{id}}"}',
        },
        {
          name: "getByFoo",
          id: "foo",
          query: '{"payload.foo": "{{id}}"}',
        },
      ],
    };

    const schema = buildSchema(
      `type Test {
          id: ID
          foo: String
          eggs: Int
        }
        type Query {
          getById(id: String): Test
          getByFoo(foo: String): Test
        }`,
    );

    it("should create a simple root", async () => {
      await db.insertOne({
        id: "test_id",
        payload: { foo: "bar", eggs: 6 },
        createdAt,
      });

      const query = `{
         getById(id: "test_id") {
               eggs
            }
        }`;

      const { root } = context(db, JWTSubAuthorizer, simple);

      const response = await graphql({
        schema,
        source: query,
        rootValue: root,
      });

      if (Object.hasOwnProperty.call(response, "errors")) {
        console.log(response.errors?.[0].message);
      } else {
        assert.equal(6, response.data?.getById.eggs);
      }
    });

    it("should query a simple root by a member", async () => {
      await db.insertOne({
        id: "test_id",
        payload: { foo: "bar", eggs: 6 },
        createdAt,
      });

      const query = `{
         getByFoo(foo: "bar") {
               id,
               eggs
            }
        }`;

      const { root } = context(db, JWTSubAuthorizer, simple);

      const response = await graphql({
        schema,
        source: query,
        rootValue: root,
      });

      if (Object.hasOwnProperty.call(response, "errors")) {
        console.log(response.errors?.[0].message);
      } else {
        assert.equal(6, response.data?.getByFoo.eggs);
        assert.equal("test_id", response.data?.getByFoo.id);
      }
    });
  });

  describe("Generating a simple vector root", () => {
    const vector = {
      singletons: [
        {
          name: "getById",
          id: "id",
          query: '{"id": "{{id}}"}',
        },
      ],
      vectors: [
        {
          name: "getByBreed",
          id: "breed",
          query: '{"payload.breed": "{{id}}"}',
        },
      ],
    };

    const schema = buildSchema(
      `type Test {
          id: ID
          name: String
          eggs: Int
          breed: String
        }
        type Query {
          getById(id: String): Test
          getByBreed(breed: String): [Test]
        }`,
    );

    it("should create a simple vector root", async () => {
      await Promise.all([
        db.insertOne({
          id: "chick_1",
          payload: { name: "henry", eggs: 3, breed: "chicken" },
          createdAt,
        }),

        db.insertOne({
          id: "chick_2",
          payload: { name: "harry", eggs: 4, breed: "chicken" },
          createdAt,
        }),
        db.insertOne({
          id: "duck_1",
          payload: { name: "quack", eggs: 2, breed: "duck" },
          createdAt,
        }),
      ]);

      const query = `{
         getByBreed(breed: "chicken") {
               id
               name
            }
        }`;

      const { root } = context(db, JWTSubAuthorizer, vector);

      const response = await graphql({
        schema,
        source: query,
        rootValue: root,
      });

      if (Object.hasOwnProperty.call(response, "errors")) {
        console.log(JSON.stringify(response.errors));
        assert.fail();
      } else {
        expect(
          response.data?.getByBreed.map((d) => d["name"]),
        ).to.include.members(["henry", "harry"]);
        expect(
          response.data?.getByBreed.map((d) => d["id"]),
        ).to.include.members(["chick_1", "chick_2"]);
      }
    });
  });

  describe("Generating a simple singleton root with a dependency", () => {
    const simple = {
      singletons: [
        {
          name: "getById",
          id: "id",
          query: '{"id": "{{id}}"}',
        },
      ],
      resolvers: [
        {
          name: "coop",
          id: "coop_id",
          queryName: "getById",
          url: "http://localhost:3000",
        },
      ],
    };

    const schema = buildSchema(
      `
        type Coop {
            name: String
        }
        type Test {
          id: ID
          name: String
          eggs: Int
          coop: Coop
        }
        type Query {
          getById(id: String): Test
        }`,
    );

    it("should call the dependency", async () => {
      fetchMock.post("http://localhost:3000", {
        data: { getById: { name: "mega" } },
      });

      await db.insertOne({
        id: "chuck",
        payload: {
          name: "chucky",
          eggs: 1,
          coop_id: "101010",
        },
        createdAt,
      });

      const query = `{
         getById(id: "chuck") {
               id, name, coop {name}
            }
        }`;

      const { root } = context(db, JWTSubAuthorizer, simple);

      const response = await graphql({
        schema,
        source: query,
        rootValue: root,
      });

      if (Object.hasOwnProperty.call(response, "errors")) {
        console.log(JSON.stringify(response.errors));
        assert.fail();
      } else {
        assert.equal("mega", response.data?.getById.coop.name);
        assert.equal("chuck", response.data?.getById.id);
      }
    });
  });
});
