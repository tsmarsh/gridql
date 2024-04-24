import { MongoMemoryServer } from "mongodb-memory-server";

import { after, before, describe, it } from "mocha";

import { build_app, parse } from "../../index.js";
import { MongoClient } from "mongodb";

import assert from "assert";

import { builderFactory } from "@gridql/payload-generator";
import { fileURLToPath } from "url";
import { dirname } from "path";
import Log4js from "log4js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mongod;
let client;
let config;
let server;

let builder;

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
  mongod = await MongoMemoryServer.create({ instance: { port: 60222 } });
  client = new MongoClient(mongod.getUri());

  builder = builderFactory({
    type: "object",
    properties: {
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

  client.db("test").collection("hens");

  config = await parse(__dirname + "/../config/simple_rest_bulk.conf");

  let app = await build_app(config);
  server = await app.listen(config.port);
});

after(async function () {
  mongod.stop();
  server.close();
});

describe("a bulky restlette", function () {
  it("it should create n documents", async function () {
    let hen_data = builder(3);

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

    const hen = JSON.stringify(hen_data);

    let create_response = await fetch("http://localhost:40025/chicks/bulk", {
      method: "POST",
      body: hen,
      redirect: "follow",
      headers: {
        "Content-Type": "application/json",
      },
    });

    let created = await create_response.json();

    let created_ids = { ids: created.OK.slice(0, 5).map((h) => h.slice(-36)) };

    const response = await fetch(
      buildUrl("http://localhost:40025/chicks/bulk", created_ids).toString(),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    let actual = await response.json();

    assert.equal(actual.length, 5);
  });

  it("should delete n documents", async function () {
    let hen_data = builder(10);

    const hen = JSON.stringify(hen_data);

    let created_response = await fetch("http://localhost:40025/chicks/bulk", {
      method: "POST",
      body: hen,
      redirect: "follow",
      headers: {
        "Content-Type": "application/json",
      },
    });

    let actual = await created_response.json();

    let ids = { ids: actual.OK.slice(0, 5).map((h) => h.slice(-36)) };

    let url = buildUrl("http://localhost:40025/chicks/bulk", ids).toString();

    const dels = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    actual = await dels.json();

    assert.equal(actual.OK.length, 5);
  });
});

function buildUrl(baseUrl, params) {
  const url = new URL(baseUrl);
  Object.keys(params).forEach((key) =>
    url.searchParams.append(key, params[key]),
  );
  return url;
}
