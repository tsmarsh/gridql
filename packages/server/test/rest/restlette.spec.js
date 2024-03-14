import {MongoMemoryServer} from "mongodb-memory-server";

import {after, before, describe, it} from "mocha";

import {build_app, parse} from "../../index.js";

import {MongoClient} from "mongodb";

import assert from "assert";
import {fileURLToPath} from "url";
import {dirname} from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


let mongod;
let client;
let config;
let server;
let id;

before(async function () {
  mongod = await MongoMemoryServer.create({ instance: { port: 60220 } });
  client = new MongoClient(mongod.getUri());
  await client.connect();

  mongod.getUri();

  client.db("test").collection("hens");

  config = await parse(__dirname + "/../config/simple_rest.conf");
  let app = await build_app(config);

  server = await app.listen(config.port);
});

after(async function () {
  mongod.stop();
  server.close();
});

describe("simple restlette", function () {
  it("it should fail if the config document is invalid", async function () {
    parse("test/../config/invalid.conf")
      .then(() => assert.fail())
      .catch((err) => {
        assert(err !== undefined);
      });
  });

  it("it should fail if the rest config document is invalid", async function () {
    parse(__dirname + "/../config/bad_rest.conf")
      .then(() => assert.fail())
      .catch((err) => {
        assert(err !== undefined);
      });
  });

  it("it should create a document ", async function () {
    let hen_data = { name: "chuck", eggs: 6 };
    const hen = JSON.stringify(hen_data);

    const response = await fetch("http://localhost:40020/hens", {
      method: "POST",
      body: hen,
      redirect: "follow",
      headers: {
        "Content-Type": "application/json",
      },
    });

    assert.equal(response.status, 200);
    const actual = await response.json();
    id = response.url.slice(-36);

    assert.equal(actual.eggs, 6);
    assert.equal(actual.name, "chuck");
  });

  it("should list all documents", async function () {
    const response = await fetch("http://localhost:40020/hens", {
      headers: {
        "Content-Type": "application/json",
      },
    });

    const actual = await response.json();

    assert.equal(actual.length, 1);
    assert.equal(actual[0], `/hens/${id}`);
  });

  it("should update a document", async function () {
    const response = await fetch("http://localhost:40020/hens/" + id, {
      method: "PUT",
      body: JSON.stringify({ name: "chuck", eggs: 9 }),
      redirect: "follow",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const actual = await response.json();

    assert.equal(actual.eggs, 9);
    assert.equal(actual.name, "chuck");
  });

  it("should delete a document", async function () {
    const response = await fetch("http://localhost:40020/hens/" + id, {
      method: "DELETE",
      redirect: "follow",
      headers: {
        "Content-Type": "application/json",
      },
    });

    assert.equal(response.status, 200);
  });
});
