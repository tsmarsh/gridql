const assert = require('assert');
const {MongoMemoryServer} = require('mongodb-memory-server');
const {MongoClient} = require('mongodb')
const {init} = require("../");
const {builderFactory} = require("data");
const {valid} = require("../validator");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

before(async function () {
    this.jsonschema = __dirname + "/../../../json-schema/billingaccount.schema.json";

    const validated = valid(this.jsonschema);

    this.events = []

    const emit = (action, id, payload) => {
        this.events.push({action, id, payload})
    }

    this.mongod = await MongoMemoryServer.create();

    this.uri = this.mongod.getUri();

    this.client = new MongoClient(this.uri);

    this.client.connect()

    this.test_db = "test_db";
    this.mongo_collection = "rest_test"
    this.db = this.client.db(this.test_db).collection(this.mongo_collection);

    const port = 30000

    const app = express();

    const context = "billingaccount"


    app.use(cors());
    app.use(bodyParser.urlencoded({extended: false}));
    app.use(bodyParser.json());

    this.server = init(context, app, this.db, validated, emit).listen(port)
});

beforeEach(async function () {
    this.events = [];
})

describe("Consumable api", async function () {

    it("can write a document", async function() {
        const billingAccount = builderFactory(this.jsonschema)();

        const response = await fetch("http://localhost:30000/billingaccount", {
            method: 'POST',
            body: JSON.stringify(billingAccount),
            headers: {'Content-Type': 'application/json'}
        }).catch(error => console.log(error));

        assert.equal(response.status, 200)
        const body = await response.json();
        assert.equal(body.accountNumber, billingAccount.accountNumber)
        assert.notEqual(body._id, null)
    })

    it("can update a document", async function() {
        const billingAccount = builderFactory(this.jsonschema)();

        const response = await fetch("http://localhost:30000/billingaccount", {
            method: 'POST',
            body: JSON.stringify(billingAccount),
            headers: {'Content-Type': 'application/json'}
        }).catch(error => console.log(error));

        const body = await response.json();

        body.accountNumber = "10101010101010";

        const updateResponse = await fetch(`http://localhost:30000/billingaccount/${body._id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
            headers: {'Content-Type': 'application/json'}
        }).catch(error => console.log(error));

        const updatedBody = await updateResponse.json();

        assert.equal(updatedBody.accountNumber, updatedBody.accountNumber)
    })

    it("can delete a document", async function() {
        const billingAccount = builderFactory(this.jsonschema)();

        const response = await fetch("http://localhost:30000/billingaccount", {
            method: 'POST',
            body: JSON.stringify(billingAccount),
            headers: {'Content-Type': 'application/json'}
        }).catch(error => console.log(error));

        const body = await response.json();


        const deleteResponse = await fetch(`http://localhost:30000/billingaccount/${body._id}`, {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'}
        }).catch(error => console.log(error));

        assert.equal(deleteResponse.status, 200)

        const readResponse = await fetch(`http://localhost:30000/billingaccount/${body._id}`, {
            method: 'GET',
            headers: {'Content-Type': 'application/json'}
        }).catch(error => console.log(error));

        assert.equal(readResponse.status, 404)
    })
});
1

describe("validation", async function () {
    it("doesn't emit an event for a partial form", async function () {
        const billingAccount = builderFactory(this.jsonschema)();
        const {status, ...partial} = billingAccount

        const response = await fetch("http://localhost:30000/billingaccount", {
            method: 'POST',
            body: JSON.stringify(partial),
            headers: {'Content-Type': 'application/json'}
        }).catch(error => console.log(error));

        const body = await response.json();

        assert.equal(response.status, 200)
        assert.equal(this.events.length, 0)

        const updateResult = await fetch(`http://localhost:30000/billingaccount/${body._id}`, {
            method: 'PUT',
            body: JSON.stringify(billingAccount),
            headers: {'Content-Type': 'application/json'}
        }).catch(error => console.log(error));

        assert.equal(updateResult.status, 200)
        const updatedBody = await updateResult.json()

        const event = this.events[0];
        assert.equal(event.id, body._id)
        assert.equal(event.action, "updated");
        assert.deepEqual(event.payload, billingAccount)
        assert.deepEqual(event.payload, updatedBody)
    });
})
after(async function () {
    this.server.close()
    this.mongod.stop();
});