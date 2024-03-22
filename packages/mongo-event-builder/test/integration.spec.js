import { Kafka, logLevel } from "kafkajs";

import { after, before, describe, it } from "mocha";

import { MongoDBContainer } from "@testcontainers/mongodb";

import { KafkaContainer } from "@testcontainers/kafka";

import { start } from "../index.js";
import { init } from "../lib/config.js";

import assert from "assert";

import { build_app, parse } from "@gridql/server";

import { OpenAPIClientAxios } from "openapi-client-axios";

import { TestConsumer } from "@gridql/kafka-consumer";

import { builderFactory } from "@gridql/payload-generator";

import { swagger } from "@gridql/server/lib/swagger.js";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let kafka;
let kafkaContainer;
let mongoContainer;
let server;
let swagger_clients = {};
let test_factory;

describe("Integrating with the rest of gridql", () => {
  it("should publish a message when a document is inserted", async () => {
    let tc = new TestConsumer(kafka, { groupId: "test-group-1" });
    await tc.init("test");
    await tc.run();

    let test = test_factory();

    let savedTest = await swagger_clients["/test/api"].create(null, test);
    let saved_id = savedTest.headers["x-canonical-id"];

    let actual = await tc.current(100);

    assert.equal(actual.id, saved_id);
    assert.equal(actual.operation, "CREATE");
  }).timeout(10000);
});

before(async function () {
  this.timeout(360000);

  //Given a mongo server
  mongoContainer = await new MongoDBContainer("mongo:6.0.6")
    .withExposedPorts(27071)
    .start()
    .catch((err) => console.log(err));

  process.env.MONGO_URI = mongoContainer.getConnectionString();

  console.log("mongodb uri: ", process.env.MONGO_URI);

  //Given a kafka server
  kafkaContainer = await new KafkaContainer()
    .withExposedPorts(9093)
    .withEnvironment({ KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true" })
    .withEnvironment({ KAFKA_DELETE_TOPIC_ENABLE: "true" })
    .start()
    .catch((reason) =>
      console.log("Kafka container failed to start: ", reason),
    );

  console.log(
    `Kafka uri: ${kafkaContainer.getHost()}:${kafkaContainer.getMappedPort(9093)}`,
  );

  process.env.KAFKA_BROKERS = `${kafkaContainer.getHost()}:${kafkaContainer.getMappedPort(9093)}`;
  process.env.KAFKA_HOST = kafkaContainer.getHost();

  kafka = new Kafka({
    logLevel: logLevel.INFO,
    brokers: [
      `${kafkaContainer.getHost()}:${kafkaContainer.getMappedPort(9093)}`,
    ],
    clientId: "mongo-event-builder-test",
  });

  //Given an event builder
  const builders = await init(__dirname + "/config/config.conf");

  await start(builders);

  //Given a gridql server
  let configFile = __dirname + "/server/config.conf";

  let config = await parse(configFile);

  let app = await build_app(config);

  server = await app.listen(config.port);

  for (let restlette of config.restlettes) {
    let swaggerdoc = swagger(restlette.path, restlette.schema, config.url);
    let api = new OpenAPIClientAxios({ definition: swaggerdoc });
    swagger_clients[restlette.path] = await api.init();
  }

  test_factory = builderFactory(config.restlettes[0].schema);
});

after(async () => {
  console.log("-----CLEANING UP------");
  server.close();
  await kafkaContainer.stop();
  await mongoContainer.stop();
});
