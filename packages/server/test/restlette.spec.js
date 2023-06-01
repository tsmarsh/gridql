const {MongoMemoryServer} = require("mongodb-memory-server");
const {describe, it, before, after} = require('mocha')

const {init, start} = require('../');
const {MongoClient} = require("mongodb");
const assert = require("assert");
const jwt = require('jsonwebtoken');


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
    let id;
    let fred_id

    let token;
    let payload;
    const secret = "secret_test";

    before(async function () {
        db = client.db("test").collection("hens");

        config = await init(__dirname + "/simple_rest.json");

        payload = {
            "sub": "1234567890",
        }

        token = jwt.sign(payload, secret, {expiresIn: '1h'});

        server = await start(config.port, config.graphlettes, config.restlettes);
    })

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

    //----

    it('it should create a document with a user', async function () {

        let hen_data = {"name": "fred", "eggs": 3};

        const hen = JSON.stringify(hen_data)

        const response = await fetch("http://localhost:40020/hens", {
            method: "POST",
            body: hen,
            redirect: "follow",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            }
        });

        assert.equal(response.status, 200);
        const actual = await response.json();
        fred_id = actual._id;

        assert.equal(actual.eggs, 3);
        assert.equal(actual.name, "fred");
        assert(actual._id !== undefined);
    });

    it("should list all documents that you have permission for", async function () {
        const response = await fetch("http://localhost:40020/hens", {
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            }
        });

        const actual = await response.json();

        assert.equal(actual.length, 1);
        assert.equal(actual[0].eggs, 3);
        assert.equal(actual[0].name, "fred");
    });

    it("should update a document if you have permission", async function () {
        const response = await fetch("http://localhost:40020/hens/" + fred_id, {
            method: "PUT",
            body: JSON.stringify({"name": "fred", "eggs": 2}),
            redirect: "follow",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            }
        });

        const actual = await response.json();

        assert.equal(actual.eggs, 2);
        assert.equal(actual.name, "fred");
    });

    it("should only delete a document if you have permission", async function () {
        const response = await fetch("http://localhost:40020/hens/" + fred_id, {
            method: "DELETE",
            redirect: "follow",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            }
        });

        assert.equal(response.status, 200);
    });
});