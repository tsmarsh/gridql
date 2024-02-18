import {EventHandler} from "./eventhandler";
import {Consumer, Kafka, logLevel} from "kafkajs";
import {Message} from "./model/message";

interface KafkaConfig {
    brokers: string[],
    host: string,
    clientId: string,
    topic: string
    groupId: string
}

interface KafkaHandlerConfig {
    kafka: KafkaConfig
}

class KafkaHandler<T> {
    kafka: Kafka;
    consumer: Consumer;

    constructor(public config: KafkaHandlerConfig, public handler: EventHandler<T>) {
        this.kafka = new Kafka({
            logLevel: logLevel.INFO,
            brokers: config.kafka.brokers,
            clientId: config.kafka.clientId,
        });

        this.consumer = this.kafka.consumer({groupId: config.kafka.groupId})
    }

    async start(): Promise<void> {
        await this.consumer.connect()

        await this.consumer.subscribe({topic: this.config.kafka.topic});

        await this.consumer.run({
            eachMessage: async ({ message }) => {
                let value = message.value;

                if (value === null) {
                } else {
                    const t: Message<T> = JSON.parse(value.toString()) as Message<T>;

                    switch (t.operation) {
                        case "CREATE":
                            this.handler.onCreate(t).catch(err => console.error("Payload error: ", t.payload));
                            break;
                        case "DELETE":
                            this.handler.onDelete(t).catch(err => console.error("Payload error: ", t.payload));
                            break;
                        case "UPDATE":
                            this.handler.onUpdate(t).catch(err => console.error("Payload error: ", t.payload));
                            break;
                    }
                }
            },
        })

        return Promise.resolve();
    }
}