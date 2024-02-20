import {Kafka, logLevel} from "kafkajs";

import {buildDb} from "@gridql/mongo-connector";

import * as hoconParser from '@pushcorn/hocon-parser';
const parser: any = hoconParser;


interface Config {
    mongo: MongoConfig;
    kafka: KafkaConfig;
}

interface MongoConfig {
    uri: string;
    db: string;
    collection: string; // Assuming ${topic} is a string
    options: MongoOptions;
}

interface MongoOptions {
    directConnection: boolean;
}

interface KafkaConfig {
    id: string,
    brokers: string[];
    host: string;
    clientId: string;
    topic: string; // Assuming ${topic} is a string
}

export const init = async (configFile: string) => {
    const config: Config = await parser
        .parse({url: configFile})
        .catch((e: Error) => console.log("Error parse config: ", e));

    console.log("Config: ", config);

    const {mongo, kafka} = config;

    //console.log(kafka);

    let k = new Kafka({
        logLevel: logLevel.INFO,
        brokers: kafka.brokers,
        clientId: kafka.clientId,
    });

    const collection = await buildDb(mongo);

    const kafkaProducer = k.producer();

    await kafkaProducer
        .connect()
        .then(() => console.log("Connected to Kafka"))
        .catch((reason) => {
                console.log("Kafka Producer failed to connect: ", reason);
                throw new Error(reason);
            }
        );

    return {collection, kafkaProducer, topic: kafka.topic, id: kafka.id};
};

module.exports = {
    init
}