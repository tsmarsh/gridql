const { MongoClient } = require('mongodb');
const {Kafka, logLevel} = require('kafkajs');

const {KafkaContainer, MongoDBContainer} = require('testcontainers');

const { start } = require('../index');
const assert = require('assert');


function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('MongoDB change listener', () => {
    let client;
    let collection;
    let kafka;
    let kafkaContainer;
    let mongoContainer;
    let kafkaProducer;

    before(async function() {
        this.timeout(360000);

        mongoContainer =  await new MongoDBContainer('mongo:6.0.6').start();

        const uri = mongoContainer.getConnectionString();

        console.log("mongodb uri: ", uri);

        client = await MongoClient.connect(uri, { directConnection: true }).catch((err) => console.log('Failed to connect to MongoDB, retrying...', err));

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

        kafkaProducer = kafka.producer();

        await kafkaProducer.connect().catch((reason) => console.log("Srsly? ", reason));
    });

    it('should publish a message when a document is inserted', async () => {
        let topic = "create-mongo-test";

        collection = client.db("test").collection(topic);

        await start({ collection, kafkaProducer, topic, id: "_id" });

        let consumer = kafka.consumer({ groupId: 'test-group-1'});

        await consumer.connect();

        await consumer.subscribe({ topic, fromBeginning: true })
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

        await delay(100);

        assert.equal(actual.id, actual_id);
        assert.equal(actual.operation, 'CREATE');
    }).timeout(10000)

    it('should publish a message when a document is updated', async () => {
        let topic = "update-mongo-test";

        collection = client.db("test").collection(topic);

        await start({ collection, kafkaProducer, topic, id: "_id" });

        let consumer = kafka.consumer({ groupId: 'test-group-2'});

        await consumer.connect();

        await consumer.subscribe({ topic, fromBeginning: true })
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
        let actual_id= result.insertedId.toString();

        await collection.updateOne({ _id: result.insertedId }, { $set: { name: 'Updated Test' }});

        await delay(100);

        assert.equal(actual.id, actual_id);
        assert.equal(actual.operation, 'UPDATE');
    }).timeout(10000)



    it('should publish a message when a document is deleted', async () => {
        let topic = "delete-mongo-test";

        collection = client.db("test").collection(topic);

        await start({ collection, kafkaProducer, topic, id: "_id" });

        let consumer = kafka.consumer({ groupId: 'test-group-3'});

        await consumer.connect();

        await consumer.subscribe({ topic, fromBeginning: true })
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
        let actual_id= result.insertedId.toString();

        await collection.deleteOne({ _id: result.insertedId });

        await delay(100);

        assert.equal(actual.id, actual_id);
        assert.equal(actual.operation, 'DELETE');
    }).timeout(10000)


    after(async () => {
        console.log("-----CLEANING UP------")
        await kafkaContainer.stop();
        await mongoContainer.stop();

    });
});