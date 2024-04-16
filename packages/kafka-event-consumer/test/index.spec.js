import { Kafka, logLevel } from "kafkajs";

import { KafkaContainer } from "@testcontainers/kafka";
import { after, before, describe, it } from "mocha";

import { init, start } from "../index.js";

import assert from "assert";

import fs from "fs";

import { swagger } from "@gridql/server/lib/swagger.js";
import nock from "nock";
import { fileURLToPath } from "url";
import { dirname } from "path";
import Log4js from "log4js";

let kafka;
let kafkaContainer;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

Log4js.configure({
  appenders: {
    out: {
      type: "stdout",
    },
  },
  categories: {
    default: { appenders: ["out"], level: "trace" },
  },
});

before(async function () {
  this.timeout(360000);

  kafkaContainer = await new KafkaContainer()
    .withExposedPorts(9093)
    .withKraft()
    .withEnvironment({ KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true" })
    .withEnvironment({ KAFKA_DELETE_TOPIC_ENABLE: "true" })
    .start()
    .catch((reason) =>
      console.log("Kafka container failed to start: ", reason),
    );

  console.log(
    `Kafka running on: ${kafkaContainer.getHost()}:${kafkaContainer.getMappedPort(9093)}`,
  );

  let config = `{consumers: [{
      kafka: {
        brokers: [
          "${kafkaContainer.getHost()}:${kafkaContainer.getMappedPort(9093)}",
        ],
        host: "${kafkaContainer.getHost()}",
        clientId: "kafka-event-consumer-test",
        topic: \${topic},
        groupId: \${topic}
      },
      schema: "${__dirname}/config/hen.schema.json",
      swagger: "file://${__dirname}/config/test.swagger.json",
    }]}`;

  fs.writeFileSync(__dirname + "/config/base.conf", config);

  kafka = new Kafka({
    logLevel: logLevel.INFO,
    brokers: [
      `${kafkaContainer.getHost()}:${kafkaContainer.getMappedPort(9093)}`,
    ],
    clientId: "mongo-event-builder-test",
  });

  const swaggerdoc = swagger(
    "/test",
    JSON.parse(
      fs.readFileSync(__dirname + "/config/hen.schema.json").toString(),
    ),
    "http://test.foo",
  );

  fs.writeFileSync(
    __dirname + "/config/test.swagger.json",
    JSON.stringify(swaggerdoc, null, 4),
  );
});

after(async () => {
  console.log("-----CLEANING UP------");
  await kafkaContainer.stop();
});

describe("Kafka change listener", () => {
  it("should call create rest api when there is a CREATE event", async () => {
    let config = await init(__dirname + "/config/create.conf");
    await start(config);

    let apiMock = nock("http://test.foo")
      .post("/test")
      .reply((uri, body) => {
        return body;
      });

    let hen = { payload: { name: "brian", eggs: 3 }, operation: "CREATE" };

    let message = {
      topic: "create-kafka-test",
      messages: [{ key: "123412341", value: JSON.stringify(hen) }],
    };

    const kafkaProducer = kafka.producer();

    await kafkaProducer
      .connect()
      .catch((reason) =>
        console.log("Kafka Producer failed to connect: ", reason),
      );

    await kafkaProducer.send(message);

    await waitForApiCall(apiMock)
      .then(() => {
        assert(true);
      })
      .catch((err) => {
        console.log(err);
        assert(false);
      });
  }).timeout(20000);

  it("should call remove rest api when there is a DELETE event", async () => {
    let config = await init(__dirname + "/config/delete.conf");
    await start(config);

    let apiMock = nock("http://test.foo")
      .delete("/test/12352")
      .reply(200, "OK");

    let hen = {
      id: "12352",
      operation: "DELETE",
    };

    let message = {
      topic: "delete-kafka-test",
      messages: [{ key: "12352", value: JSON.stringify(hen) }],
    };

    const kafkaProducer = kafka.producer();

    await kafkaProducer
      .connect()
      .catch((reason) =>
        console.log("Kafka Producer failed to connect: ", reason),
      );

    await kafkaProducer.send(message);

    await waitForApiCall(apiMock)
      .then(() => {
        assert(true);
      })
      .catch((err) => {
        console.log(err);
        assert(false);
      });
  }).timeout(20000);

  it("should call update rest api when there is a UPDATE event", async () => {
    let config = await init(__dirname + "/config/update.conf");
    await start(config);

    let hen = {
      id: "12352",
      payload: { _id: "12352", name: "brian", eggs: 3 },
      operation: "UPDATE",
    };

    let apiMock = nock("http://test.foo").put("/test/12352").reply(200, "OK");

    let message = {
      topic: "update-kafka-test",
      messages: [{ key: "12352", value: JSON.stringify(hen) }],
    };

    const kafkaProducer = kafka.producer();

    await kafkaProducer
      .connect()
      .catch((reason) =>
        console.log("Kafka Producer failed to connect: ", reason),
      );

    await kafkaProducer.send(message);

    await waitForApiCall(apiMock)
      .then(() => {
        assert(true);
      })
      .catch((err) => {
        console.log(err);
        assert(false);
      });
  }).timeout(20000);
});

const waitForApiCall = (apiMock) => {
  return new Promise((resolve, reject) => {
    const intervalId = setInterval(() => {
      if (apiMock.isDone()) {
        clearInterval(intervalId);
        resolve();
      } else {
        console.log("Message not received, retrying");
      }
    }, 1000);

    setTimeout(() => {
      clearInterval(intervalId);
      reject(new Error("Timeout waiting for API call"));
    }, 10000);
  });
};
