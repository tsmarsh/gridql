const { MongoMemoryServer } = require("mongodb-memory-server");
const { describe, it, before, after } = require("mocha");

const { init, start } = require("../../index");
const { MongoClient } = require("mongodb");
const assert = require("assert");
const { builderFactory } = require("@gridql/payload-generator");

let mongod;
let uri;
let client;
let db;
let config;
let server;
let id;

let builder;

before(async function () {
  mongod = await MongoMemoryServer.create({ instance: { port: 60222 } });
  client = new MongoClient(mongod.getUri());

  builder = builderFactory({
    type: "object",
    properties: {
      _id: {
        type: "string",
        format: "id",
      },
      name: {
        type: "string",
        faker: "animal.horse",
      },
      eggs: {
        type: "integer",
        minimum: 0,
        maximum: 10,
      },
      coop_id: {
        type: "string",
        format: "id",
      },
    },
    required: ["name"],
    additionalProperties: false,
  });

  await client.connect();

  uri = mongod.getUri();

  db = client.db("test").collection("hens");

  config = await init(__dirname + "/../config/simple_rest_bulk.conf");

  server = await start(
    config.url,
    config.port,
    config.graphlettes,
    config.restlettes
  );
});

after(async function () {
  mongod.stop();
  server.close();
});

describe("a bulky restlette", function () {
  it("it should create n documents", async function () {
    let hen_data = builder(3);
    for (let h of hen_data) {
      delete h["_id"];
    }

    const hen = JSON.stringify(hen_data);

    const response = await fetch("http://localhost:40025/chicks/bulk", {
      method: "POST",
      body: hen,
      redirect: "follow",
      headers: {
        "Content-Type": "application/json",
      },
    });

    assert.equal(response.status, 200);
    const actual = await response.json();

    assert.equal(actual.OK.length, 3);
  });

  it("it should create a large number of documents", async function () {
    let hen_data = builder(100);
    for (let h of hen_data) {
      delete h["_id"];
    }

    const hen = JSON.stringify(hen_data);

    const response = await fetch("http://localhost:40025/chicks/bulk", {
      method: "POST",
      body: hen,
      redirect: "follow",
      headers: {
        "Content-Type": "application/json",
      },
    });

    assert.equal(response.status, 200);
    const actual = await response.json();

    assert.equal(actual.OK.length, 100);
  });

  it("should read n documents", async function () {
    let hen_data = builder(10);
    for (h of hen_data) {
      delete h["_id"];
    }

    const hen = JSON.stringify(hen_data);

    await fetch("http://localhost:40025/chicks/bulk", {
      method: "POST",
      body: hen,
      redirect: "follow",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await fetch("http://localhost:40025/chicks", {
      headers: {
        "Content-Type": "application/json",
      },
    });

    let actual = await response.json();

    let ids = { ids: actual.slice(0, 5).map((h) => h._id) };

    let url = buildUrl("http://localhost:40025/chicks/bulk", ids).toString();

    console.log("URL:", url);

    const read = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    actual = await read.json();

    assert.equal(actual.OK.length, 5);
  });

  it("should delete n documents", async function () {
    let hen_data = builder(10);
    for (h of hen_data) {
      delete h["_id"];
    }

    const hen = JSON.stringify(hen_data);

    await fetch("http://localhost:40025/chicks/bulk", {
      method: "POST",
      body: hen,
      redirect: "follow",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await fetch("http://localhost:40025/chicks", {
      headers: {
        "Content-Type": "application/json",
      },
    });

    let actual = await response.json();

    let ids = { ids: actual.slice(0, 5).map((h) => h.slice(-36)) };

    let url = buildUrl("http://localhost:40025/chicks/bulk", ids).toString();

    console.log("URL:", url);

    const read = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    actual = await read.json();

    assert.equal(actual.OK.length, 5);
  });
});

function buildUrl(baseUrl, params) {
  const url = new URL(baseUrl);
  Object.keys(params).forEach((key) =>
    url.searchParams.append(key, params[key])
  );
  return url;
}
