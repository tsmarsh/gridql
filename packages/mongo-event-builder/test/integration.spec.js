const {MongoClient} = require("mongodb");
const {Kafka, logLevel} = require("kafkajs");

const {KafkaContainer, MongoDBContainer} = require("testcontainers");

const {start, init} = require("../index");
const assert = require("assert");
const fs = require("fs");
const {parse, build_app} = require("@gridql/server");
const { default: OpenAPIClientAxios } = require("openapi-client-axios");
const {TestConsumer} = require("@gridql/kafka-consumer");
const {builderFactory} = require("@gridql/payload-generator");
const {swagger} = require("@gridql/server/lib/swagger");

let client;
let kafka;
let kafkaContainer;
let mongoContainer;
let server;
let swagger_clients = {}
let test_factory;

describe("Integrating with the rest of gridql", () => {

    it("should publish a message when a document is inserted", async () => {
        let tc = new TestConsumer(kafka, {groupId: "test-group-1"})
        await tc.init("test");
        await tc.run();

        let test = test_factory();

        let savedTest = await swagger_clients["/test/api"].create(null, test);
        let saved_id = savedTest.headers["x-canonical-id"];

        let actual = await tc.current()

        assert.equal(actual.id, saved_id);
        assert.equal(actual.operation, "CREATE");
    }).timeout(10000);
});

before(async function () {
    this.timeout(360000);

    //Given a mongo server
    mongoContainer = await new MongoDBContainer("mongo:6.0.6")
        .withExposedPorts(27071)
        .start().catch(err => console.log(err));

    process.env.MONGO_URI = mongoContainer.getConnectionString();

    console.log("mongodb uri: ", process.env.MONGO_URI);

    client = await MongoClient.connect(process.env.MONGO_URI, {directConnection: true}).catch(
        (err) => console.log("Failed to connect to MongoDB, retrying...", err)
    );

    //Given a kafka server
    kafkaContainer = await new KafkaContainer()
        .withExposedPorts(9093)
        .withEnvironment({KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"})
        .withEnvironment({KAFKA_DELETE_TOPIC_ENABLE: "true"})
        .start()
        .catch((reason) =>
            console.log("Kafka container failed to start: ", reason)
        );

    console.log(
        `${kafkaContainer.getHost()}:${kafkaContainer.getMappedPort(9093)}`
    );

    process.env.KAFKA_BROKERS = `${kafkaContainer.getHost()}:${kafkaContainer.getMappedPort(9093)}`
    process.env.KAFKA_HOST = kafkaContainer.getHost();

    kafka = new Kafka({
        logLevel: logLevel.INFO,
        brokers: [
            `${kafkaContainer.getHost()}:${kafkaContainer.getMappedPort(9093)}`,
        ],
        clientId: "mongo-event-builder-test",
    });

    //Given an event builder
    const {collection, kafkaProducer, topic} = await init(
        __dirname + "/config/config.conf"
    );

    await start({collection, kafkaProducer, topic, id: "id"});

    //Given a gridql server
    let configFile = __dirname + "/server/config.conf";

    let config = await parse(configFile);

    let app = await build_app(config);

    server = await app.listen(config.port);

    for(let restlette of config.restlettes){
        let swaggerdoc = swagger(restlette.path, restlette.schema, config.url)
        let api = new OpenAPIClientAxios({ definition: swaggerdoc });
        swagger_clients[restlette.path] = await api.init()
    }

    test_factory = builderFactory(config.restlettes[0].schema)

});

after(async () => {
    console.log("-----CLEANING UP------");
    await kafkaContainer.stop();
    await mongoContainer.stop();
});