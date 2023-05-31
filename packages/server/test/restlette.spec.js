const {MongoMemoryServer} = require("mongodb-memory-server");
const {describe, it, before, after} = require('mocha')

const {init, start} = require('../');
const {MongoClient} = require("mongodb");
const assert = require("assert");

let mongod;
let uri;
let client;

before(async function () {
    mongod = await MongoMemoryServer.create({instance: {port: 60220}});
    client = new MongoClient(mongod.getUri());
    await client.connect();

    uri = mongod.getUri();
});

after(async function () {
    mongod.stop();
});

describe('simple restlette', function () {
    let db;
    let config;
    let server;

    before(async function () {
        db = client.db("test").collection("hens");

        config = await init(__dirname + "/simple_rest.json");

        server = await start(config.port, config.graphlettes, config.restlettes);
        server.listen();
    })

    it('it should create a document ', async function() {
        const hen = JSON.stringify({"name": "chuck", "eggs": 6})

        const response = await fetch("http://localhost:40020/hens", {
            method: "POST",
            body: hen,
            headers: {
                "Content-Type": "application/json"
            }
        });

        assert.equal(response.status, 200);
    });
});