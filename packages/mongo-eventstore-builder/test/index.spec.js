const { MongoClient } = require("mongodb");
const {
  EventStoreDBClient,
  FORWARDS,
  START,
  NO_STREAM,
} = require("@eventstore/db-client");

const { MongoDBContainer, GenericContainer } = require("testcontainers");

const { start, init } = require("../lib/initialiser");
const assert = require("assert");
const fs = require("fs");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("MongoDB change listener", () => {
  let client;
  let eventStore;
  let eventContainer;
  let mongoContainer;

  before(async function () {
    this.timeout(360000);

    // MongoDB Container setup
    mongoContainer = await new MongoDBContainer("mongo:6.0.6")
        .withExposedPorts(27017)
        .start();

    const uri = mongoContainer.getConnectionString();
    console.log("mongodb uri: ", uri);

    client = await MongoClient.connect(uri, { directConnection: true }).catch(
        (err) => console.log("Failed to connect to MongoDB, retrying...", err)
    );

    // EventStoreDB Container Setup
    eventContainer = await new GenericContainer("eventstore/eventstore:23.6.0-alpha-arm64v8")
        .withExposedPorts(2113)
        .withCommand(['--insecure', '--run-projections=All', '--enable-atom-pub-over-http'] )
        .start().catch((reason) => console.log("EventStore sucks because: " + reason));

    let config = `
        {
            "mongo": {
                "uri": "${uri}",
                "db": "test",
                "collection": "testCollection",
                "options": {
                  "directConnection": true
                }
            },
            "eventstoredb": {
                "connectionString": "${eventContainer.getHost()}:${eventContainer.getMappedPort(2113)}",
                "streamName": "test"
            }
        }`;

    eventStore = new EventStoreDBClient({endpoint: `${eventContainer.getHost()}:${eventContainer.getMappedPort(2113)}`});

    fs.writeFileSync(__dirname + "/config/base.conf", config);
  });

  it("should publish a message when a document is inserted", async () => {
    const { collection, client, streamName } = await init(
        __dirname + "/config/create.conf"
    );

    await start({ collection, client, streamName, id: "_id" });

    const result = await collection.insertOne({ name: "Test" });
    let actual_id = result.insertedId.toString();

    const actual = await readEvent(eventStore, streamName, "CREATE");

    assert.equal(actual.id, actual_id);
    assert.equal(actual.operation, "CREATE");
  }).timeout(10000);

  it("should publish a message when a document is updated", async () => {
    const { collection, client, streamName } = await init(
        __dirname + "/config/update.conf"
    );

    await start({ collection, client, streamName, id: "_id" });

    const insertResult = await collection.insertOne({ name: "Test" });
    let actual_id = insertResult.insertedId.toString();

    await collection.updateOne(
        { _id: insertResult.insertedId },
        { $set: { name: "Updated Test" } }
    );

    const actual = await readEvent(streamName, "UPDATE");

    assert.equal(actual.id, actual_id);
    assert.equal(actual.operation, "UPDATE");
  }).timeout(10000);

  it("should publish a message when a document is deleted", async () => {
    const { collection, client, streamName } = await init(
        __dirname + "/config/delete.conf"
    );

    await start({ collection, client, streamName, id: "_id" });

    const insertResult = await collection.insertOne({ name: "Test" });
    let actual_id = insertResult.insertedId.toString();

    await collection.deleteOne({ _id: insertResult.insertedId });

    const actual = await readEvent(streamName, "DELETE");

    assert.equal(actual.id, actual_id);
    assert.equal(actual.operation, "DELETE");
  }).timeout(10000);

  after(async () => {
    console.log("-----CLEANING UP------");
    await mongoContainer.stop();
    await eventContainer.stop();
  });
});

async function readEvent(eventStore, streamName, expectedOperation) {
  let loop = 0;
  let actual;
  while (!actual && loop < 10) {
    try {
      const events = await eventStore.readStream(streamName, {
        direction: FORWARDS,
        fromRevision: START,
        maxCount: 1,
      });

      if (events.length > 0 && events[0].event) {
        actual = JSON.parse(events[0].event.data);
        if (actual.operation === expectedOperation) {
          return actual;
        }
      }
    } catch (error) {
      if (error.type !== NO_STREAM) {
        throw error;
      }
    }
    await delay(50);
    loop++;
  }
  return actual;
}
