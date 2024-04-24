import { MongoMemoryServer } from "mongodb-memory-server";

import { MongoClient, ObjectId } from "mongodb";

import { build_app, parse } from "../../index.js";

import { swagger } from "../../lib/swagger.js";

import assert from "assert";

import { after, it, before, describe } from "mocha";

import { OpenAPIClientAxios } from "openapi-client-axios";

import jwt from "jsonwebtoken";

import { v4 } from "uuid";
import { fileURLToPath } from "url";
import { dirname } from "path";
import Log4js from "log4js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mongod;
let client;
let config;
let server;
let api;
let swagger_client;

let id;

let payload;

Log4js.configure({
  appenders: {
    out: {
      type: "stdout",
    },
  },
  categories: {
    default: { appenders: ["out"], level: "trace" },
  },
});
before(async function () {
  mongod = await MongoMemoryServer.create({ instance: { port: 60323 } });
  client = new MongoClient(mongod.getUri());
  await client.connect();

  client.db("test").collection("hens");

  config = await parse(__dirname + "/../config/simple_swagger.conf");
  let app = await build_app(config);

  payload = {
    sub: "1234567890",
  };
  server = await app.listen(config.port);

  const swaggerdoc = swagger(
    config.restlettes[0].path,
    config.restlettes[0].schema,
    config.url,
  );

  let token = jwt.sign(payload, "totallyASecret", { expiresIn: "1h" });

  api = new OpenAPIClientAxios({
    definition: swaggerdoc,
    axiosConfigDefaults: {
      headers: {
        Authorization: "Bearer " + token,
      },
    },
  });
  swagger_client = await api.init();
});

after(async function () {
  mongod.stop();
  server.close();
});

describe("The published swagger should work", function () {
  it("should not read a non-document", async function () {
    try {
      await swagger_client.read({ id: new ObjectId() });
    } catch (err) {
      assert.equal(err.response.status, 404);
    }
  });

  it("it should create a document ", async function () {
    let hen_data = { name: "chuck", eggs: 6 };

    const result = await swagger_client.create(null, hen_data);

    assert.equal(result.status, 200);
    assert.equal(result.data.eggs, 6);
    assert.equal(result.data.name, "chuck");

    id = result.request.path.slice(-36);
    assert.equal(result.headers["x-canonical-id"], id);
  });

  it("it shouldn't create a bad document ", async function () {
    let hen_data = { gname: "bad", eggs: 6 };

    try {
      await swagger_client.create(null, hen_data);
    } catch (err) {
      assert.equal(err.response.status, 404);
    }
  });

  it("should read a document", async function () {
    const result = await swagger_client.read({ id });

    assert.equal(result.status, 200);
    assert.equal(result.data.eggs, 6);
    assert.equal(result.data.name, "chuck");
  });

  it("should update a document", async function () {
    let { data: actual, ...result } = await swagger_client.update(
      { id },
      { name: "chuck", eggs: 9 },
    );

    assert.equal(result.status, 200);
    assert.equal(actual.eggs, 9);
    assert.equal(actual.name, "chuck");
  });

  it("shouldn't update a missing document", async function () {
    try {
      await swagger_client.update({ id: v4() }, { name: "chuck", eggs: 12 });
    } catch (err) {
      assert.equal(err.response.status, 404);
    }
  });

  it("should delete a document", async function () {
    const result = await swagger_client.delete({ id });

    assert.equal(result.status, 200);
  });

  it("shouldn't delete a missing document", async function () {
    try {
      await swagger_client.delete({ id: v4() });
    } catch (err) {
      assert.equal(err.response.status, 404);
    }
  });
});
