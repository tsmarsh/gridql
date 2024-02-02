const {init} = require("./lib/config");

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


  const documentId = change.hasOwnProperty("fullDocument") ? change.fullDocument[id] : change.documentKey[id];

  const message = {
    id: documentId.toString(),
    operation: operationType,
  };

  return { key: message.id, value: JSON.stringify(message) };
};

const start = async ({ collection, kafkaProducer, topic, id = "id" }) => {
  console.log("Starting builder: ", collection, kafkaProducer, topic, id)

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
      console.log("Sending: ", JSON.stringify(message));

      await kafkaProducer
        .send(message)
        .then(() => console.log("Sent: ", JSON.stringify(message)))
        .catch((reason) => console.log("Can't send: ", reason));
      payloads = [];
    }
  });
};

module.exports = { init, start };
