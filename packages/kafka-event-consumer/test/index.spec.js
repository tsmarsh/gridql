const { Kafka, logLevel } = require("kafkajs");

const { KafkaContainer } = require("testcontainers");

const { start, init } = require("../lib/initialiser");
const assert = require("assert");
const fs = require("fs");
const { swagger } = require("@gridql/server/lib/swagger");
const nock = require("nock");

let kafka;
let kafkaContainer;

describe("Kafia change listener", () => {
  it("should call create rest api when there is a CREATE event", async () => {
    let config = await init(__dirname + "/config/create.conf");
    await start(config);

    let apiMock = nock("http://test.foo")
      .post("/test")
      .reply((uri, body) => {
        return body;
      });

    let hen = { name: "brian", eggs: 3, operation: "CREATE" };

    let message = {
      topic: "create-kafka-test",
      messages: [{ key: "123412341", value: JSON.stringify(hen) }],
    };

    const kafkaProducer = kafka.producer();

    await kafkaProducer
      .connect()
      .catch((reason) =>
        console.log("Kafka Producer failed to connect: ", reason)
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
  }).timeout(10000);

  it("should call the update rest api a message when there is an UPDATE event", async () => {}).timeout(
    10000
  );

  it("should call the delete api when there is a DELETE event", async () => {}).timeout(
    10000
  );
});

before(async function () {
  this.timeout(360000);

  kafkaContainer = await new KafkaContainer()
    .withExposedPorts(9093)
    .withEnvironment({ KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true" })
    .withEnvironment({ KAFKA_DELETE_TOPIC_ENABLE: "true" })
    .start()
    .catch((reason) =>
      console.log("Kafka container failed to start: ", reason)
    );

  console.log(
    `Kafka running on: ${kafkaContainer.getHost()}:${kafkaContainer.getMappedPort(
      9093
    )}`
  );

  let config = `{
      kafka: {
        brokers: [
          "${kafkaContainer.getHost()}:${kafkaContainer.getMappedPort(9093)}",
        ],
        host: "${kafkaContainer.getHost()}",
        clientId: "kafka-event-consumer-test",
        topic: \${topic},
        groupId: "consumer-test"
      },
      schema: "${__dirname}/config/hen.schema.json}",
      swagger: "${__dirname}/config/test.swagger.json",
    }`;

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
      fs.readFileSync(__dirname + "/config/hen.schema.json").toString()
    ),
    "http://test.foo"
  );

  fs.writeFileSync(
    __dirname + "/config/test.swagger.json",
    JSON.stringify(swaggerdoc, null, 4)
  );
});

after(async () => {
  console.log("-----CLEANING UP------");
  //await kafkaContainer.stop();
});

const waitForApiCall = (apiMock) => {
  return new Promise((resolve, reject) => {
    const intervalId = setInterval(() => {
      if (apiMock.isDone()) {
        clearInterval(intervalId);
        resolve();
      }
    }, 100);

    setTimeout(() => {
      clearInterval(intervalId);
      reject(new Error("Timeout waiting for API call"));
    }, 2000);
  });
};
