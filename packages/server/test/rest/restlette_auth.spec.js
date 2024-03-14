import { MongoMemoryServer } from "mongodb-memory-server";

import { after, before, describe, it } from "mocha";

import { build_app, parse } from "../../index.js";

import { MongoClient } from "mongodb";

import assert from "assert";

import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mongod;
let client;

let config;
let server;
let fred_id;
let other_id;

let token;
let other_token;

let payload;
const secret = "secret_test";

before(async function () {
  mongod = await MongoMemoryServer.create({ instance: { port: 60230 } });
  client = new MongoClient(mongod.getUri());
  await client.connect();

  config = await parse(__dirname + "/../config/rest_auth.conf");

  payload = {
    sub: "1234567890",
  };

  token = jwt.sign(payload, secret, { expiresIn: "1h" });
  other_token = jwt.sign(
    {
      sub: "0987654321",
    },
    "not a secret",
    { expiresIn: "1h" },
  );

  let app = await build_app(config);
  server = app.listen(config.port);
});

after(async function () {
  mongod.stop();
  server.close();
});

describe("simple restlette with auth", function () {
  let fred;

  it("it should create a document with a user", async function () {
    let hen_data = { name: "fred", eggs: 3 };

    const hen = JSON.stringify(hen_data);

    const response = await fetch("http://localhost:40022/hens", {
      method: "POST",
      body: hen,
      redirect: "follow",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    });

    assert.equal(response.status, 200);
    fred = await response.json();
    fred_id = response.url.slice(-36);

    assert.equal(fred.eggs, 3);
    assert.equal(fred.name, "fred");
  });

  it("should list all documents that you have permission for", async function () {
    let hen_data = { name: "evil", eggs: 5 };

    const hen = JSON.stringify(hen_data);

    let other_response = await fetch("http://localhost:40022/hens", {
      method: "POST",
      body: hen,
      redirect: "follow",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + other_token,
      },
    });

    other_id = other_response.url.slice(-36);

    const response = await fetch("http://localhost:40022/hens", {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    });

    const actual = await response.json();

    assert.equal(actual.length, 1);
  });

  it("should update a document if you have permission", async function () {
    fred.eggs = 2;
    const response = await fetch("http://localhost:40022/hens/" + fred_id, {
      method: "PUT",
      body: JSON.stringify(fred),
      redirect: "follow",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    });

    const actual = await response.json();

    assert.equal(actual.eggs, 2);
    assert.equal(actual.name, "fred");
  });

  it("should not update a document if you don't have permission", async function () {
    const response = await fetch("http://localhost:40022/hens/" + other_id, {
      method: "PUT",
      body: JSON.stringify({ name: "evil", eggs: 1 }),
      redirect: "follow",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    });

    assert.equal(response.status, 403);
  });

  it("should only delete a document if you have permission", async function () {
    const response = await fetch("http://localhost:40022/hens/" + fred_id, {
      method: "DELETE",
      redirect: "follow",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    });

    assert.equal(response.status, 200);
  });

  it("should not delete a document if you do not have permission", async function () {
    const response = await fetch("http://localhost:40022/hens/" + other_id, {
      method: "DELETE",
      redirect: "follow",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    });

    assert.equal(response.status, 403);
  });
});
