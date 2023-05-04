const { expect } = require('chai');
const { graphql } = require('graphql');

const { init, start} = require('../src/server');
const {before} = require("mocha");
const {MongoMemoryServer} = require("mongodb-memory-server");
const {MongoClient} = require("mongodb");
const {callSubgraph} = require("subgraph/src/call");


describe('GraphQL Server', () => {
  let mongod;
  let uri;
  let config;
  let server;
  let db;

  before(async function () {
    mongod = await MongoMemoryServer.create({instance: {port: 60219}});
    let client = new MongoClient(mongod.getUri());
    await client.connect();
    db = client.db("test").collection("test");
    config = init(__dirname + "/simple.json");
    server = start(config);

    uri = mongod.getUri();
  });

  after(async function() {
    mongod.stop();
  });

  it('returns "Hello, world!" for the hello query', async () => {
    const result = await db.insertOne({foo: "bar", eggs: 11});

    const query = `{
         getById(id: "${result?.insertedId}") {
               eggs
            }
        }`;

    const json = await callSubgraph("http://localhost:40000/test", query, "getById");

    expect(json.eggs).to.equal(11);
  });
});

