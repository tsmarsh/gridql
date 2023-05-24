const {before, after, describe, it} = require("mocha")
const {MongoMemoryReplSet} = require("mongodb-memory-server");
const {listen} = require("../index");
const {MongoClient} = require("mongodb");
const assert = require("assert");

let replSet;
let client;
let uri;

before(async function () {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 2 }  });
    uri = replSet.getUri();
    client = new MongoClient(uri);
    await client.connect();


});

after(async function () {
    replSet.stop();
});

describe("events", function () {
    it("should emit an event for a create", async () => {
        const producer = {};
        let payload = null;

        let collection = client.db("test").collection("test");
        producer.send = (message) => {payload = message; return Promise.resolve()};

        await listen(collection, producer, "_id", "test_topic");

        const result = await collection.insertOne({name: "test"});


        assert.equals("test_topic", payload.topic);

    })

});