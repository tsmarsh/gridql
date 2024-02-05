const {OpenAPIClientAxios} = require("openapi-client-axios");
const {builderFactory} = require("@gridql/payload-generator")
const assert = require("assert");
const {DockerComposeEnvironment} = require("testcontainers");
const { Kafka, logLevel } = require("kafkajs");

const path = require('path');
const fs = require("fs");
const {TestConsumer} = require("@gridql/kafka-consumer");

let environment;
let schema;
let kafka;
let swagger_clients = {}

async function createKafkaTopic(topicName, numPartitions = 1, replicationFactor = 1) {
    const admin = kafka.admin();

    try {
        await admin.connect();
        await admin.createTopics({
            topics: [
                {
                    topic: topicName,
                    numPartitions,
                    replicationFactor,
                },
            ],
        });

        console.log(`Topic "${topicName}" created successfully.`);
    } catch (error) {
        console.error(`Error creating topic "${topicName}":`, error);
    } finally {
        await admin.disconnect();
    }
}


before(async function () {
    this.timeout(200000);

    environment = await new DockerComposeEnvironment(__dirname ).up();

    for(let restlette of ["test"]){
        let rest = await fetch(`http://localhost:3033/${restlette}/api/api-docs/swagger.json`)
        let swaggerdoc = await rest.json();
        let api = new OpenAPIClientAxios({ definition: swaggerdoc });
        swagger_clients[`/${restlette}/api`] = await api.init()
    }

    schema = JSON.parse(fs.readFileSync(__dirname + "/service/json/test.schema.json").toString());

    kafka = new Kafka({
        //logLevel: logLevel.INFO,
        brokers: ["localhost:19093"],
        clientId: "db-events-test",
    });

    await createKafkaTopic("test")
});

describe("Should build docker image and run", function () {
    this.timeout(20000);
    it("should create a test", async () => {
        //Given I have a consumer
        let tc = new TestConsumer(kafka, {groupId: "docker-test"})
        await tc.init("test");
        await tc.run();

        //When an event is sent to a context

        let test_factory = builderFactory(schema)
        let test = test_factory()

        const result = await swagger_clients["/test/api"].create(null, test);

        let actual_id = result.headers["x-canonical-id"];

        const actual = await tc.current(500);

        assert.notEqual(actual, undefined);

        //Then we should get a record that the event has been saved
        assert.equal(actual.id, actual_id);
        assert.equal(actual.operation, "CREATE");

        assert.equal(result.status, 200);
        assert.equal(result.data.name, test.name);
    })
});

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}