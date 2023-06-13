const {MongoMemoryServer} = require("mongodb-memory-server");
const {describe, it, before, after} = require('mocha')

const {init, start} = require('../index');
const {MongoClient} = require("mongodb");
const assert = require("assert");
const {builderFactory} = require("payload-generator");


let mongod;
let uri;
let client;
let db;
let config;
let server;
let id;

let builder;


before(async function () {
    mongod = await MongoMemoryServer.create({instance: {port: 60222}});
    client = new MongoClient(mongod.getUri());

    builder = builderFactory({
        "type": "object",
        "properties": {
            "_id": {
                "type": "string",
                "format": "id"
            },
            "name": {
                "type": "string",
                "faker": "animal.horse"
            },
            "eggs": {
                "type": "integer",
                "minimum": 0,
                "maximum": 10

            },
            "coop_id": {
                "type": "string",
                "format": "id"
            }
        },
        "required": ["name"],
        "additionalProperties": false
    });

    await client.connect();

    uri = mongod.getUri();

    db = client.db("test").collection("hens");

    config = await init(__dirname + "/config/simple_rest_bulk.json");

    server = await start(config.url, config.port, config.graphlettes, config.restlettes);
});

after(async function () {
    mongod.stop();
    server.close();
});

describe('a bulky restlette', function () {

    it('it should create n documents', async function () {

        let hen_data = builder(3);
        for(h of hen_data){
            delete h["_id"]
        }

        const hen = JSON.stringify(hen_data)

        const response = await fetch("http://localhost:40025/chicks/bulk", {
            method: "POST",
            body: hen,
            redirect: "follow",
            headers: {
                "Content-Type": "application/json"
            }
        });

        assert.equal(response.status, 200);
        const actual = await response.json();

        assert(actual.OK.length, 3);
    });

    // it("should list all documents", async function () {
    //     const response = await fetch("http://localhost:40020/hens", {
    //         headers: {
    //             "Content-Type": "application/json"
    //         }
    //     });
    //
    //     const actual = await response.json();
    //
    //     assert.equal(actual.length, 1);
    //     assert.equal(actual[0].eggs, 6);
    //     assert.equal(actual[0].name, "chuck");
    // });
    //
    // it("should update a document", async function () {
    //     const response = await fetch("http://localhost:40020/hens/" + id, {
    //         method: "PUT",
    //         body: JSON.stringify({"name": "chuck", "eggs": 12}),
    //         redirect: "follow",
    //         headers: {
    //             "Content-Type": "application/json"
    //         }
    //     });
    //
    //     const actual = await response.json();
    //
    //     assert.equal(actual.eggs, 12);
    //     assert.equal(actual.name, "chuck");
    // });
    //
    // it("should delete a document", async function () {
    //     const response = await fetch("http://localhost:40020/hens/" + id, {
    //         method: "DELETE",
    //         redirect: "follow",
    //         headers: {
    //             "Content-Type": "application/json"
    //         }
    //     });
    //
    //     assert.equal(response.status, 200);
    // });
});