const parser = require("@pushcorn/hocon-parser");
const { buildDb } = require("@gridql/mongo-connector");
const { EventStoreDBClient, FORWARDS, START, NO_STREAM, jsonEvent } = require("@eventstore/db-client");

var CONFIG;

const init = async (configFile) => {
  CONFIG = await parser
      .parse({ url: configFile })
      .catch((e) => console.log("Error parse config: ", e));

  console.log("Config: ", CONFIG);

  const { mongo, eventstoredb } = CONFIG;

  const client = new EventStoreDBClient({endpoint: `${eventstoredb.connectionString}`});

  const collection = await buildDb(mongo);

  checkEventStoreHealth(client)

  return { collection, client, streamName: eventstoredb.streamName, id: CONFIG.id };
};

const toCRUD = (change) => {
  const verbs = {
    insert: "CREATE",
    update: "UPDATE",
    delete: "DELETE",
  };

  return verbs[change.operationType];
};

const toEvent = (id) => (change) => {
  const operationType = toCRUD(change);
  if (operationType === undefined) {
    return null;
  }

  const documentId = change.documentKey[id];

  const eventData = {
    id: documentId.toString(),
    operation: operationType,
  };

  return jsonEvent({
    type: operationType,
    data: eventData,
  });
};

const start = async ({ collection, cluent, streamName, id = "_id" }) => {
  const changeStream = await collection.watch();

  const processEvent = toEvent(id);

  changeStream.on("change", async (change) => {
    console.log("Change detected:", change);
    const event = processEvent(change);
    if (event !== null) {
      console.log("Appending event: ", event);

      try {
        const client = new EventStoreDBClient({endpoint: `${CONFIG.eventstoredb.connectionString}`});
        await client.appendToStream(streamName, event);
        console.log("Event appended");
      } catch (error) {
        console.log("Error appending event: ", error);
      }
    }
  });
};

async function checkEventStoreHealth(client, timeout = 30000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      // Attempt to read from a system stream or any known stream
      await client.readStream("$users", { direction: FORWARDS, fromRevision: START, maxCount: 1 });
      console.log("EventStoreDB up");
      return true; // If read is successful, the service is healthy
    } catch (error) {
      if (error.type !== NO_STREAM) {
        console.error("Health check failed:", error);
        return false; // If an error other than NO_STREAM occurs, consider the service unhealthy
      }
    }
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for a second before retrying
  }
  return false; // If the timeout is reached, consider the service unhealthy
}

module.exports = { init, start };
