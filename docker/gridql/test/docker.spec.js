import { OpenAPIClientAxios } from "openapi-client-axios";

import { builderFactory } from "@gridql/payload-generator";

import assert from "assert";

import fs from "fs";

import { DockerComposeEnvironment } from "testcontainers";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { before, describe, it } from "mocha";

let swagger_clients = {};

let schema;

before(async function () {
  this.timeout(200000);

  await new DockerComposeEnvironment(__dirname, "gridql-test-compose.yml").up();

  for (let restlette of ["test"]) {
    let rest = await fetch(
      `http://localhost:3033/${restlette}/api/api-docs/swagger.json`,
    );
    let swaggerdoc = await rest.json();
    let api = new OpenAPIClientAxios({ definition: swaggerdoc });
    swagger_clients[`/${restlette}/api`] = await api.init();
  }

  schema = JSON.parse(
    fs.readFileSync(__dirname + "/config/json/test.schema.json").toString(),
  );
});

describe("Should build docker image and run", function () {
  it("should create a test", async () => {
    let test_factory = builderFactory(schema);
    let test = test_factory();

    const result = await swagger_clients["/test/api"].create(null, test);

    assert.equal(result.status, 200);
    assert.equal(result.data.name, test.name);
    assert(result.data.id !== undefined);
  });
});
