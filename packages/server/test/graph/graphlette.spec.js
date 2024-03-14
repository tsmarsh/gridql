import { MongoMemoryServer } from "mongodb-memory-server";

import { expect } from "chai";

import { after, before, describe, it } from "mocha";

import { build_app, parse } from "../../index.js";

import { MongoClient } from "mongodb";

import { callSubgraph } from "@gridql/graph";

import assert from "assert";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mongod;
let client;

before(async function () {
  mongod = await MongoMemoryServer.create({ instance: { port: 60219 } });
  client = new MongoClient(mongod.getUri());
  await client.connect();
});

after(async function () {
  mongod.stop();
});

describe("Single node", function () {
  this.timeout(5000);
  let db;
  let config;
  let server;

  before(async function () {
    db = client.db("test").collection("test");

    config = await parse(__dirname + "/../config/simple.conf");
    let app = await build_app(config);

    server = await app.listen(config.port);
  });

  after(() => server.close());

  it("it should fail if the rest config document is invalid", async function () {
    parse(__dirname + "/config/bad_graph.conf")
      .then(() => assert.fail())
      .catch((err) => {
        assert(err !== undefined);
      });
  });

  it("should error politely when query is invalid", async function () {
    const query = `{
         getByEggs(eggs: 3") {
               name 
               }
            }
        }`;

    await callSubgraph(`http://localhost:40000/test`, query, "getById")
      .then(() => assert.fail())
      .catch((err) => {
        assert(err !== undefined);
      });
  });

  it("should build a simple server", async function () {
    await db.insertOne({
      id: "testid",
      payload: { foo: "bar", eggs: 6 },
      createdAt: new Date(),
    });

    const query = `{
         getById(id: "testid") {
               eggs
            }
        }`;

    const json = await callSubgraph(
      "http://localhost:40000/test",
      query,
      "getById",
    );

    expect(json.eggs).to.equal(6);
  });
});
