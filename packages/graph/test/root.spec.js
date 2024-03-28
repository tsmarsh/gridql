import { MongoMemoryServer } from "mongodb-memory-server";

import { MongoClient } from "mongodb";

import { context } from "../lib/root.js";

import { buildSchema, graphql } from "graphql";

import { expect } from "chai";

import sinon from "sinon";

import assert from "assert";

let db;
let test_db = "test_db";
let mongo_collection = "simple";
let mongod;
let createdAt = new Date();

import { after, afterEach, before, describe, it } from "mocha";

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
          query: '{"id": "${id}"}',
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

      const { root } = context(db, simple);

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
  });

  describe("Generating a simple scalar root", () => {
    const scalar = {
      singletons: [
        {
          name: "getById",
          id: "id",
          query: '{"id": "${id}"}',
        },
      ],
      scalars: [
        {
          name: "getByBreed",
          id: "breed",
          query: '{"payload.breed": "${id}"}',
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

    it("should create a simple scalr root", async () => {
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

      const { root } = context(db, scalar);

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

  describe("Generating a simple scalar root with a dependency", () => {
    afterEach(() => {
      sinon.restore();
    });

    const simple = {
      singletons: [
        {
          name: "getById",
          id: "id",
          query: '{"id": "${id}"}',
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
      sinon.stub(global, "fetch").resolves({
        text: () =>
          Promise.resolve(
            JSON.stringify({ data: { getById: { name: "mega" } } }),
          ),
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

      const { root } = context(db, simple);

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
