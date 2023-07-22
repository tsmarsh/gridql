const { MongoMemoryServer } = require("mongodb-memory-server");
const { expect } = require("chai");
const { describe, it, before, after } = require("mocha");

const { init, start } = require("../index");
const { MongoClient } = require("mongodb");
const { callSubgraph } = require("../lib/callgraph");
const assert = require("assert");

let mongod;
let uri;
let client;

before(async function () {
  mongod = await MongoMemoryServer.create({ instance: { port: 60219 } });
  client = new MongoClient(mongod.getUri());
  await client.connect();

  uri = mongod.getUri();
});

after(async function () {
  mongod.stop();
});

describe("Single node", function () {
  let db;
  let config;
  let server;

  before(async function () {
    db = client.db("test").collection("test");

    config = await init(__dirname + "/config/simple.conf");

    server = await start(
      config.url,
      config.port,
      config.graphlettes,
      config.restlettes
    );
  });

  it("it should fail if the rest config document is invalid", async function () {
    init(__dirname + "/config/bad_graph.conf")
      .then(() => fail())
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
      .then(() => fail())
      .catch((err) => {
        assert(err !== undefined);
      });
  });

  it("should build a simple server", async function () {
    await db.insertOne({
      id: "testid",
      payload: { foo: "bar", eggs: 6 },
      createdAt: Date.now(),
    });

    const query = `{
         getById(id: "testid") {
               eggs
            }
        }`;

    const json = await callSubgraph(
      "http://localhost:40000/test",
      query,
      "getById"
    );

    expect(json.eggs).to.equal(6);
  });
});
