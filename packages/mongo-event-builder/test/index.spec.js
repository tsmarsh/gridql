import { Kafka, logLevel } from "kafkajs";

import { KafkaContainer, MongoDBContainer } from "testcontainers";

import { start } from "../index.js";

import { init } from "../lib/config.js";

import assert from "assert";

import fs from "fs";

import { TestConsumer } from "@gridql/kafka-consumer";

import { after, before, describe, it } from "mocha";
import { fileURLToPath } from "url";
import { dirname } from "path";

let kafka;
let kafkaContainer;
let mongoContainer;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("MongoDB change listener", () => {
  it("should publish a message when a document is inserted", async () => {
    const { collection, kafkaProducer, topic } = await init(
      __dirname + "/config/create.conf",
    );
    await start({ collection, kafkaProducer, topic, id: "_id" });

    let tc = new TestConsumer(kafka, { groupId: "test-group-1" });
    await tc.init(topic);
    await tc.run();

    const result = await collection.insertOne({ name: "Test" });
    let actual_id = (result.insertedId = result.insertedId.toString());

    let actual = await tc.current();

    assert.equal(actual.id, actual_id);
    assert.equal(actual.operation, "CREATE");
  }).timeout(10000);

  it("should publish a message when a document is updated", async () => {
    const { collection, kafkaProducer, topic } = await init(
      __dirname + "/config/update.conf",
    );

    await start({ collection, kafkaProducer, topic, id: "_id" });

    let tc = new TestConsumer(kafka, { groupId: "test-group-2" });
    await tc.init(topic);
    await tc.run();

    const result = await collection.insertOne({ name: "Test" });
    let actual_id = result.insertedId.toString();

    await collection.updateOne(
      { _id: result.insertedId },
      { $set: { name: "Updated Test" } },
    );

    let actual = await tc.current();

    assert.equal(actual.id, actual_id);
    assert.equal(actual.operation, "UPDATE");
  }).timeout(10000);

  it("should publish a message when a document is deleted", async () => {
    const { collection, kafkaProducer, topic } = await init(
      __dirname + "/config/delete.conf",
    );

    await start({ collection, kafkaProducer, topic, id: "_id" });

    let tc = new TestConsumer(kafka, { groupId: "test-group-3" });
    await tc.init(topic);
    await tc.run();

    const result = await collection.insertOne({ name: "Test" });
    let actual_id = result.insertedId.toString();

    await collection.deleteOne({ _id: result.insertedId });

    let actual = await tc.current();

    assert.equal(actual.id, actual_id);
    assert.equal(actual.operation, "DELETE");
  }).timeout(10000);
});

before(async function () {
  this.timeout(360000);

  mongoContainer = await new MongoDBContainer("mongo:6.0.6")
    .withExposedPorts(27071)
    .start()
    .catch((err) => console.log(err));

  const uri = mongoContainer.getConnectionString();

  console.log("mongodb uri: ", uri);

  kafkaContainer = await new KafkaContainer()
    .withExposedPorts(9093)
    .withEnvironment({ KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true" })
    .withEnvironment({ KAFKA_DELETE_TOPIC_ENABLE: "true" })
    .start()
    .catch((reason) =>
      console.log("Kafka container failed to start: ", reason),
    );

  console.log(
    `${kafkaContainer.getHost()}:${kafkaContainer.getMappedPort(9093)}`,
  );

  let config = `
        {
            "mongo": {
                "uri": "${mongoContainer.getConnectionString()}",
                "db": "test",
                "collection": \${topic},
                "options": {
                  "directConnection": true
                }
                
            },
            "kafka": {
                "brokers": ["${kafkaContainer.getHost()}:${kafkaContainer.getMappedPort(
                  9093,
                )}"],
                    "host": "${kafkaContainer.getHost()}",
                "clientId": "mongo-event-builder-test",
                "topic": \${topic}
            }
        }`;

  kafka = new Kafka({
    logLevel: logLevel.INFO,
    brokers: [
      `${kafkaContainer.getHost()}:${kafkaContainer.getMappedPort(9093)}`,
    ],
    clientId: "mongo-event-builder-test",
  });

  fs.writeFileSync(__dirname + "/config/base.conf", config);
});

after(async () => {
  console.log("-----CLEANING UP------");
  await kafkaContainer.stop();
  await mongoContainer.stop();
});
