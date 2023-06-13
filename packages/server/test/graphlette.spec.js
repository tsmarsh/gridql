const {MongoMemoryServer} = require("mongodb-memory-server");
const {expect} = require('chai');
const {describe, it, before, after} = require('mocha')

const {init, start} = require('../index');
const {MongoClient} = require("mongodb");
const {callSubgraph} = require("../lib/callgraph")
const bodyParser = require('body-parser');

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

describe('Single node', function () {
  let db;
  let config;
  let server;

  before(async function () {
    db = client.db("test").collection("test");

    config = await init(__dirname + "/config/simple.json");

    server = await start(config.url, config.port, config.graphlettes, config.restlettes);
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

describe('Complex nodes', function () {
  let hens_db;
  let coops_db;
  let farms_db;
  let config;
  let server;

  before(async function () {
    hens_db = client.db("complex").collection("hens");
    coops_db = client.db("complex").collection("coops");
    farms_db = client.db("complex").collection("farms");

    config = await init(__dirname + "/config/complex.json");

    server = await start(config.port, config.graphlettes, config.restlettes);
  })

  it('should build a server with multiple nodes', async function() {
    const farm_result = await farms_db.insertOne({name: "Emerdale"});

    const coop1_result = await coops_db.insertOne({name: "red", farm_id: `${farm_result.insertedId}`})
    const coop2_result = await coops_db.insertOne({name: "yellow", farm_id: `${farm_result.insertedId}`})
    const coop3_result = await coops_db.insertOne({name: "pink", farm_id: `${farm_result.insertedId}`})

    await hens_db.insertOne({name: "buck", eggs: 1, coop_id: `${coop1_result.insertedId}`})
    await hens_db.insertOne({name: "chuck", eggs: 2, coop_id: `${coop1_result.insertedId}`})
    await hens_db.insertOne({name: "duck", eggs: 0, coop_id: `${coop1_result.insertedId}`})

    await hens_db.insertOne({name: "euck", eggs: 1, coop_id: `${coop2_result.insertedId}`})
    await hens_db.insertOne({name: "fuck", eggs: 2, coop_id: `${coop2_result.insertedId}`})

    const query = `{
         getById(id: "${farm_result.insertedId}") {
               name 
               coops {
                name
                hens {
                  eggs
                  name
                }
               }
            }
        }`;

    const json = await callSubgraph("http://localhost:40001/farms", query, "getById");

    expect(json.name).to.equal("Emerdale");

    expect(json.coops.length).to.equal(3);
  });
});