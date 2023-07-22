const { MongoMemoryServer } = require("mongodb-memory-server");
const { MongoClient, ObjectId } = require("mongodb");
const { init, start } = require("../index");
const { swagger } = require("../lib/swagger");
const assert = require("assert");
const { after, it } = require("mocha");
const OpenAPIClientAxios = require("openapi-client-axios").default;
const jwt = require("jsonwebtoken");
const { v4 } = require("uuid");

let mongod;
let uri;
let client;
let db;
let config;
let server;
let api;
let swagger_client;

let id;

let payload;

before(async function () {
  mongod = await MongoMemoryServer.create({ instance: { port: 60323 } });
  client = new MongoClient(mongod.getUri());
  await client.connect();

  uri = mongod.getUri();

  db = client.db("test").collection("hens");

  config = await init(__dirname + "/config/simple_swagger.conf");

  payload = {
    sub: "1234567890",
  };
  server = await start(
    config.url,
    config.port,
    config.graphlettes,
    config.restlettes
  );

  const swaggerdoc = swagger(
    config.restlettes[0].path,
    config.restlettes[0].schema,
    config.url
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
      { name: "chuck", eggs: 9 }
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
