import { OpenAPIClientAxios } from "openapi-client-axios";

import { builderFactory } from "@gridql/payload-generator";

import assert from "assert";

import { DockerComposeEnvironment } from "testcontainers";

import { Kafka } from "kafkajs";

import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import fs from "fs";

import { TestConsumer } from "@gridql/kafka-consumer";

import { before, describe, it } from "mocha";

let schema;
let kafka;
let swagger_clients = {};

async function createKafkaTopic(
  topicName,
  numPartitions = 1,
  replicationFactor = 1,
) {
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

  await new DockerComposeEnvironment(__dirname).up();

  for (let restlette of ["test"]) {
    let rest = await fetch(
      `http://localhost:3033/${restlette}/api/api-docs/swagger.json`,
    );
    let swaggerdoc = await rest.json();
    let api = new OpenAPIClientAxios({ definition: swaggerdoc });
    swagger_clients[`/${restlette}/api`] = await api.init();
  }

  schema = JSON.parse(
    fs.readFileSync(__dirname + "/service/json/test.schema.json").toString(),
  );

  kafka = new Kafka({
    //logLevel: logLevel.INFO,
    brokers: ["localhost:19093"],
    clientId: "db-events-test",
  });

  await createKafkaTopic("test");
  await createKafkaTopic("serviced");
});

describe("Should build docker image and integrate", function () {
  this.timeout(200000);
  it("should create a test", async () => {
    //When an event is sent to a context
    let tc = new TestConsumer(kafka, { groupId: "q-events-test" });
    await tc.init("serviced");
    await tc.run();

    //and when I submit a test object to the input topic
    let test_factory = builderFactory(schema);
    let test = test_factory();

    let msg = { payload: test, operation: "CREATE" };

    let message = {
      topic: "test",
      messages: [{ key: "123412341", value: JSON.stringify(msg) }],
    };

    const kafkaProducer = kafka.producer();

    await kafkaProducer
      .connect()
      .catch((reason) =>
        console.log("Kafka Producer failed to connect: ", reason),
      );

    await kafkaProducer.send(message);

    //Then I should see the message get stored in the database

    const actual = await tc.current(500);
    assert.equal(actual.operation, "CREATE");
  });
});
