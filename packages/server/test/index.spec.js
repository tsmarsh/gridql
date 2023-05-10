const {MongoMemoryServer} = require("mongodb-memory-server");
const {expect} = require('chai');

const {init, start} = require('../');
const {MongoClient} = require("mongodb");
const {callSubgraph} = require("@tsmarsh/callgraph")

let mongod;
let uri;
let client;

before(async function () {
  mongod = await MongoMemoryServer.create({instance: {port: 60219}});
  client = new MongoClient(mongod.getUri());
  await client.connect();

  uri = mongod.getUri();
});

after(async function () {
  mongod.stop();
});

describe('GraphQL Server', function () {
  let db;
  let config;
  let server;

  before(async function () {
    db = client.db("test").collection("test");

    config = await init(__dirname + "/simple.json");

    server = await start(config.port, config.graphlettes);
  })

  it('should build a simple server', async function() {
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

