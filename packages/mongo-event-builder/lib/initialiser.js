const { Kafka, logLevel } = require("kafkajs");
const parser = require("@pushcorn/hocon-parser");
const { buildDb } = require("@gridql/mongo-connector");

const init = async (configFile) => {
  const config = await parser
    .parse({ url: configFile })
    .catch((e) => console.log("Error parse config: ", e));

  console.log("Config: ", config);

  const { mongo, kafka } = config;

  let k = new Kafka({
    logLevel: logLevel.INFO,
    brokers: kafka.brokers,
    clientId: kafka.clientId,
  });

  const collection = await buildDb(mongo);

  const kafkaProducer = k.producer();

  await kafkaProducer
    .connect()
    .catch((reason) =>
      console.log("Kafka Producer failed to connect: ", reason)
    );

  return { collection, kafkaProducer, topic: kafka.topic, id: config.id };
};

let payloads = [];

const toCRUD = (change) => {
  const verbs = {
    insert: "CREATE",
    update: "UPDATE",
    delete: "DELETE",
  };

  return verbs[change.operationType];
};

const toPayload = (id) => (change) => {
  const operationType = toCRUD(change);
  if (operationType === undefined) {
    return null;
  }

  // get the document id
  const documentId = change.documentKey[id];

  // prepare a message to send to Kafka
  const message = {
    id: documentId.toString(),
    operation: operationType,
  };

  return { key: message.id, value: JSON.stringify(message) };
};

const start = async ({ collection, kafkaProducer, topic, id = "_id" }) => {
  const changeStream = await collection.watch();

  const processChange = toPayload(id);

  changeStream.on("change", async (change) => {
    console.log("Change detected:", change);
    let payload = processChange(change);
    if (payload !== null) {
      payloads.push(payload);
    }
    if (payloads.length > 0) {
      let message = { topic, messages: payloads };
      console.log("Sending: ", message);

      await kafkaProducer
        .send(message)
        .then(console.log("Sent"))
        .catch((reason) => console.log("Can't send: ", reason));
      payloads = [];
    }
  });
};

module.exports = { init, start };
