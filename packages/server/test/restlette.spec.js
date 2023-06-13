const {MongoMemoryServer} = require("mongodb-memory-server");
const {describe, it, before, after} = require('mocha')

const {init, start} = require('../index');
const {MongoClient} = require("mongodb");
const assert = require("assert");


let mongod;
let uri;
let client;
let db;
let config;
let server;
let id;

let payload;


before(async function () {
    mongod = await MongoMemoryServer.create({instance: {port: 60220}});
    client = new MongoClient(mongod.getUri());
    await client.connect();

    uri = mongod.getUri();

    db = client.db("test").collection("hens");

    config = await init(__dirname + "/config/simple_rest.json");

    payload = {
        "sub": "1234567890",
    }
    server = await start(config.url, config.port, config.graphlettes, config.restlettes);
});

after(async function () {
    mongod.stop();
    server.close();
});

describe('simple restlette', function () {

    it('it should create a document ', async function () {

        let hen_data = {"name": "chuck", "eggs": 6};
        const hen = JSON.stringify(hen_data)

        const response = await fetch("http://localhost:40020/hens", {
            method: "POST",
            body: hen,
            redirect: "follow",
            headers: {
                "Content-Type": "application/json"
            }
        });

        assert.equal(response.status, 200);
        const actual = await response.json();
        id = actual._id;

        assert.equal(actual.eggs, 6);
        assert.equal(actual.name, "chuck");
        assert(actual._id !== undefined);
    });

    it("should list all documents", async function () {
        const response = await fetch("http://localhost:40020/hens", {
            headers: {
                "Content-Type": "application/json"
            }
        });

        const actual = await response.json();

        assert.equal(actual.length, 1);
        assert.equal(actual[0].eggs, 6);
        assert.equal(actual[0].name, "chuck");
    });

    it("should update a document", async function () {
        const response = await fetch("http://localhost:40020/hens/" + id, {
            method: "PUT",
            body: JSON.stringify({"name": "chuck", "eggs": 12}),
            redirect: "follow",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const actual = await response.json();

        assert.equal(actual.eggs, 12);
        assert.equal(actual.name, "chuck");
    });

    it("should delete a document", async function () {
        const response = await fetch("http://localhost:40020/hens/" + id, {
            method: "DELETE",
            redirect: "follow",
            headers: {
                "Content-Type": "application/json"
            }
        });

        assert.equal(response.status, 200);
    });
});