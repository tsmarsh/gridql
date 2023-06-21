const { MongoMemoryServer } = require("mongodb-memory-server");
const { MongoClient } = require("mongodb");
const { init, start } = require("../index");
const { swagger } = require("../lib/crud");
const assert = require("assert");
const { after } = require("mocha");
const OpenAPIClientAxios = require("openapi-client-axios").default;

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

  api = new OpenAPIClientAxios({ definition: swaggerdoc });
  swagger_client = await api.init();
});

after(async function () {
  mongod.stop();
  server.close();
});

describe("The published swagger should work", function () {
  it("it should create a document ", async function () {
    let hen_data = { name: "chuck", eggs: 6 };
    const hen = JSON.stringify(hen_data);

    const result = await swagger_client.create(null, hen_data);

    assert.equal(result.status, 200);
    assert.equal(result.data.eggs, 6);
    assert.equal(result.data.name, "chuck");
    assert(result.data._id !== undefined);

    id = result.data._id;

    // assert.equal(response.status, 200);
    // const actual = await response.json();
    // id = actual._id;
    //
    // assert.equal(actual.eggs, 6);
    // assert.equal(actual.name, "chuck");
    // assert(actual._id !== undefined);
  });
});
