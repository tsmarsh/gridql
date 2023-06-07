const { MongoClient } = require('mongodb');
const {Kafka} = require('kafkajs');
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

describe('MongoDB change listener', () => {
    let client;
    let collection;
    let kafka_admin;
    let kafka;

    before(async function() {


        const uri =

        console.log("mongodb uri: ", uri);

        client = await connectWithRetry(uri, { useUnifiedTopology: true, connectTimeoutMS:2000, appName: 'farts' });

        collection = client.db("test").collection("frogs");

        kafka = new Kafka({
            clientId: 'test',
            brokers: ['pkc-p11xm.us-east-1.aws.confluent.cloud:9092'],
            ssl: true,
            sasl: {
                mechanism: 'plain'
            }
        });

        kafka_admin = kafka.admin();
        await kafka_admin.connect().catch((reason) => console.log("The fuck? ", reason));

        await kafka_admin.createTopics({
            topics: [{ topic: 'test', numPartitions: 1 }],
        }).catch((reason) => console.log("Kafka shit the bed", reason));

        const kafkaProducer = kafka.producer();

        await kafkaProducer.connect().catch((reason) => console.log("Srsly? ", reason));

        await start({ collection, kafkaProducer, test: "test"});
    });

    after(async () => {
        // after all tests, disconnect from the in-memory MongoDB instance
        try {
            // after all tests, disconnect from the in-memory MongoDB instance
            await collection.drop();
        } catch (err) {
            console.error('Error dropping collection:', err);
        }
        try {
            await kafka_admin.deleteTopics({
                topics: ['test'],
            });
        } catch (err) {
            console.error('Error deleting topic:', err);
        }

        await kafka_admin.disconnect();
        await client.close();
    });

    it('should publish a message when a document is inserted', async () => {

        let consumer = kafka.consumer({ groupId: 'test-group-1'});

        await consumer.connect();
        await consumer.subscribe({ topic: 'test', fromBeginning: true });

        let actual;

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                console.log({
                    partition,
                    offset: message.offset,
                    value: message.value.toString(),
                })
                actual = JSON.parse(message.value.toString());
            }
        });

        const result = await collection.insertOne({ name: 'Test' });

        await delay(1000);

        assert.equal(actual.name, 'test');
    });

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
});