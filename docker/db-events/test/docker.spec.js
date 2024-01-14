const {OpenAPIClientAxios} = require("openapi-client-axios");
const {builderFactory} = require("@gridql/payload-generator")
const assert = require("assert");
const {DockerComposeEnvironment} = require("testcontainers");
const { Kafka, logLevel } = require("kafkajs");

const path = require('path');
const fs = require("fs");

let environment;
let schema;
let kafka;
let swagger_clients = {}

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

});

describe("Should build docker image and run", function () {
    it("should create a test", async () => {
        let actual;
        let topic = "docker-test";
        let consumer = kafka.consumer({ groupId: topic });

        //Given I have a consumer
        await consumer
            .subscribe({ topic, fromBeginning: true })
            .then(() => {
                console.log("Subscribed");
            })
            .catch((reason) => console.log("can't subscribe: ", reason));

        //When the consumer gets a message
        await consumer.run({
            eachMessage: async ({ partition, message }) => {
                console.log("Event received: ", {
                    partition,
                    offset: message.offset,
                    value: message.value.toString(),
                });
                actual = JSON.parse(message.value.toString());
            },
        });

        //When an event is sent to a context

        let test_factory = builderFactory(schema)
        let test = test_factory()

        const result = await swagger_clients["/test/api"].create(null, test);

        let actual_id = result.request.path.slice(-36);

        let loop = 0;
        while (actual === undefined && loop < 10) {
            await delay(100);
            loop++;
        }

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