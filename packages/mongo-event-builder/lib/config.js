import { Kafka, logLevel } from "kafkajs";

import parser from "@pushcorn/hocon-parser";

import { buildDb } from "@gridql/mongo-connector";

import Log4js from "log4js";

let logger = Log4js.getLogger("gridql/mongo-event-builder");

export const init = async (configFile) => {
  const config = await parser
    .parse({ url: configFile })
    .catch((e) => logger.error(`Error parse config: ${JSON.stringify(e, null, 2)}`));

  logger.info(`Config: ${JSON.stringify(config, null, 2)}`);

  const { builders } = config;

  return Promise.all(
    builders.map(async ({ mongo, kafka }) => {
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
          logger.error(`Kafka Producer failed to connect: ${JSON.stringify(readon, null, 2)}`);
          throw new Error(reason);
        });

      return { collection, kafkaProducer, topic: kafka.topic, id: kafka.id };
    }),
  );
};
