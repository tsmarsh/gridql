const { MongoClient } = require("mongodb");
const { Kafka } = require("kafkajs");






async function init({mongo, kafka}) {
    const client = new MongoClient(mongo.url);

    const kfka = new Kafka(kafka);

    const producer = kfka.producer();

    // Connect to MongoDB and Kafka
    await client.connect();
    await producer.connect();

    const db = client.db(mongo.db);
    const collection = db.collection(mongo.collection);

    return {collection, producer};
}

function buildMessage(change, id) {
    const operationType = change.operationType;
    const documentKey = change.fullDocument[id];
    const fullDocument = change.fullDocument || {};

    // Create a message to send to Kafka based on the change event
    const message = {
        key: documentKey.toString(),
        value: JSON.stringify({
            operationType,
            document: fullDocument
        }),
        resumeToken: change.resumeToken
    };
    return message;
}

async function listen(collection, producer, id, topic, resumeToken) {

    const watchions = { fullDocument: 'updateLookup' }

    if (resumeToken !== undefined) {
        watchions["resumeAfter"] = resumeToken
    }

    // Create a change stream on the MongoDB collection
    const changeStream = collection.watch();

    // Listen for changes in the collection
    changeStream.on("change", async (change) => {
        console.log("Change detected:", change);

        // Extract the relevant information from the change event
        const message = buildMessage(change, id);

        // Produce the event to a Kafka topic
        await producer.send({
            topic: topic,
            messages: [message]
        });

    });
}

module.exports = {
    init, listen
}
