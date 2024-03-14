import { swagger } from "@gridql/server/lib/swagger.js";

import { OpenAPIClientAxios } from "openapi-client-axios";

import { builderFactory } from "@gridql/payload-generator";

import assert from "assert";

import { MongoMemoryServer } from "mongodb-memory-server";
import { after, before, describe, it } from "mocha";
import { fileURLToPath } from "url";
import { dirname } from "path";
import {build_app} from "@gridql/server";
import {parse} from "@gridql/server/lib/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mongod;
let server;
let swagger_clients = {};
let config;

before(async function () {
  this.timeout(10000);

  mongod = await MongoMemoryServer.create();

  process.env.MONGO_URI = mongod.getUri();

  let configFile = __dirname + "/config/integration.conf";

  config = await parse(configFile);
  let app = await build_app(config);

  server = await app.listen(config.port);

  for (let restlette of config.restlettes) {
    let swaggerdoc = swagger(restlette.path, restlette.schema, config.url);
    let api = new OpenAPIClientAxios({ definition: swaggerdoc });
    swagger_clients[restlette.path] = await api.init();
  }
});

after(async function () {
  console.log("------Cleaning Up------");
  server.close();
  mongod.stop();
});

describe("Should fire up a base config and run", function () {
  it("should create a test", async () => {
    let test_factory = builderFactory(config.restlettes[0].schema);
    let test = test_factory();

    const result = await swagger_clients["/test/api"].create(null, test);

    assert.equal(result.status, 200);
    assert.equal(result.data.name, test.name);
    assert(result.data.id !== undefined);
  });
});
