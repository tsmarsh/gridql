const { MongoClient } = require('mongodb');
const {Kafka, logLevel} = require('kafkajs');

const {KafkaContainer, GenericContainer} = require('testcontainers');

const { start } = require('../index');
const assert = require('assert');


function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function connectWithRetry(uri, options, maxRetries = 10) {
    let client;

    for (let i = 0; i < maxRetries; i++) {
        try {
            client = await MongoClient.connect(uri, options);
            console.log('Connected to MongoDB');
            return client;
        } catch (err) {
            console.log('Failed to connect to MongoDB, retrying...', err);
            await delay(5000);  // wait for 5 seconds before retrying
        }
    }
    throw new Error('Failed to connect to MongoDB');
}

async function listTopics(kafka) {
    const admin = kafka.admin();
    await admin.connect()

    await admin.listTopics().then((topics) => console.log("Topics: ", topics)).catch((reason) => console.log("Can't list topics: ", reason));

    await admin.disconnect();
}

describe('MongoDB change listener', () => {
    let client;
    let collection;
    let kafka;
    let kafkaContainer;

    let topic = "mongo-test";

    before(async function() {
        this.timeout(360000);

        const uri = `mongodb+srv://grid:Co2FcjhiIBujByXM@cluster0.7nr1dmw.mongodb.net/?retryWrites=true&w=majority`;

        console.log("mongodb uri: ", uri);

        client = await connectWithRetry(uri, { useUnifiedTopology: true, connectTimeoutMS:2000, appName: 'farts' });

        collection = client.db("test").collection("frogs");


        kafkaContainer = await new KafkaContainer()
            .withExposedPorts(9093)
            .withEnvironment({"KAFKA_AUTO_CREATE_TOPICS_ENABLE": "true"})
            .withEnvironment({"KAFKA_DELETE_TOPIC_ENABLE": "true"})
            .start()
            .catch((reason) => console.log("Kafka container failed to start: ", reason));

        kafka = new Kafka({
            logLevel: logLevel.INFO,
            brokers: [`${kafkaContainer.getHost()}:${kafkaContainer.getMappedPort(9093)}`],
            clientId: 'mongo-event-builder-test',
        });

        const kafkaProducer = kafka.producer();

        await kafkaProducer.connect().catch((reason) => console.log("Srsly? ", reason));

        await start({ collection, kafkaProducer, topic: topic, id: "_id" });
    });

    it('should publish a message when a document is inserted', async () => {

        let consumer = kafka.consumer({ groupId: 'test-group-1'});

        await consumer.connect();
        await consumer.subscribe({ topic: 'mongo-test', fromBeginning: true })
            .then(() => {console.log("Subscribed")})
            .catch((reason) => console.log("can't subscribe: ", reason));

        let actual;

        await consumer.run({
            eachMessage: async ({ partition, message }) => {
                console.log("Event received: ",{
                    partition,
                    offset: message.offset,
                    value: message.value.toString(),
                })
                actual = JSON.parse(message.value.toString());
            }
        });

        const result = await collection.insertOne({ name: 'Test' });
        let actual_id = result.insertedId = result.insertedId.toString();

        await delay(1000);

        assert.equal(actual.id, actual_id);
        assert.equal(actual.operation, 'CREATE');
    }).timeout(10000)

    // it('should publish a message when a document is updated', async () => {
    //     // update a document in the collection
    //     const result = await collection.updateOne({ name: 'Test' }, { $set: { name: 'Updated Test' }});
    //
    //     // verify that a message was published
    //     sinon.assert.calledOnce(kafkaProducer.send);
    //     const payload = JSON.parse(kafkaProducer.send.getCall(0).args[0][0].messages);
    //     expect(payload).to.have.property('_id');
    //     expect(payload).to.have.property('operation', 'update');
    // });


    //
    // it('should publish a message when a document is deleted', async () => {
    //     // delete a document from the collection
    //     const result = await collection.deleteOne({ name: 'Updated Test' });
    //
    //     // verify that a message was published
    //     sinon.assert.calledOnce(kafkaProducer.send);
    //     const payload = JSON.parse(kafkaProducer.send.getCall(0).args[0][0].messages);
    //     expect(payload).to.have.property('_id');
    //     expect(payload).to.have.property('operation', 'delete');
    // });
    after(async () => {
        console.log("-----CLEANING UP------")
        // after all tests, disconnect from the in-memory MongoDB instance
        try {
            // after all tests, disconnect from the in-memory MongoDB instance
            await collection.drop();
        } catch (err) {
            console.error('Error dropping collection:', err);
        }

        await kafkaContainer.stop();
        await client.close();
    });
});