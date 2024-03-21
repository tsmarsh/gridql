import Log4js from "log4js";

let logger = Log4js.getLogger("gridql/mongo-event-builder");

export const toCRUD = (change) => {
  const verbs = {
    insert: "CREATE",
    update: "UPDATE",
    delete: "DELETE",
  };

  return verbs[change.operationType];
};

export const toPayload = (id) => (change) => {
  const operationType = toCRUD(change);
  if (operationType === undefined) {
    return null;
  }

  const documentId = Object.hasOwnProperty.call(change, "fullDocument")
    ? change.fullDocument[id]
    : change.documentKey[id];

  const message = {
    id: documentId.toString(),
    operation: operationType,
  };

  return { key: message.id, value: JSON.stringify(message) };
};

export const start = async (builders) => {
  return Promise.all(builders.map((builder) => run(builder)));
};

export const run = async ({ collection, kafkaProducer, topic, id = "id" }) => {
  logger.info(`Starting builder: ${topic}, ${id}`);

  let payloads = [];
  const changeStream = await collection.watch();

  const processChange = toPayload(id);

  changeStream.on("change", async (change) => {
    logger.trace(`Change detected: ${change}`);
    let payload = processChange(change);
    if (payload !== null) {
      payloads.push(payload);
    }
    if (payloads.length > 0) {
      let message = { topic, messages: payloads };
      logger.debug(`Sending: ${JSON.stringify(message)}`);

      await kafkaProducer
        .send(message)
        .then(() => logger.trace(`Sent: ${JSON.stringify(message)}`))
        .catch((reason) => logger.error(`Can't send: ${JSON.stringify(reason, null, 2)}`));
      payloads = [];
    }
  });
};
