import { Kafka, logLevel } from "kafkajs";

import parser from "@pushcorn/hocon-parser";

import { OpenAPIClientAxios } from "openapi-client-axios";

import fs from "fs";

import { valid } from "@gridql/payload-validator";

import { parseUrl } from "@gridql/url";

import Log4js from "log4js";

import retry from "async-retry";

let logger = Log4js.getLogger("gridql/kafka-event-consumer");

export const init = async (configFile) => {
  const config = await parser
    .parse({ url: configFile })
    .catch((e) => logger.error("Error parse config: ", e));

  logger.info(`Config: ${JSON.stringify(config, null, 2)}`);

  return Promise.all(
    config.consumers.map(async ({ kafka, swagger, schema }) => {
      let k = new Kafka({
        logLevel: logLevel.INFO,
        brokers: kafka.brokers,
        clientId: kafka.clientId,
      });

      const kafkaConsumer = k.consumer({ groupId: kafka.groupId });

      let swaggerText = await parseUrl(swagger);
      let swagger_doc = JSON.parse(swaggerText);

      logger.info(`Swagger doc: ${swaggerText}`);

      let api = new OpenAPIClientAxios({ definition: swagger_doc });
      let apiClient = await api.init().catch((err) => {
        logger.error(`Failed to create client: ${JSON.stringify(err)}`);
      });

      let validator = valid(JSON.parse(fs.readFileSync(schema, "utf-8")));

      return { apiClient, kafkaConsumer, validator, topic: kafka.topic };
    }),
  );
};

export const start = async (consumers) => {
  return Promise.all(consumers.map((consumer) => run(consumer)));
};
export const run = async ({ apiClient, kafkaConsumer, validator, topic }) => {
  await retry(
    async () => {
      await kafkaConsumer.connect();

      await kafkaConsumer.subscribe({ topic });

      await kafkaConsumer.run({
        eachMessage: eachMessage(apiClient, validator),
      });
    },
    {
      retries: 5,
      factor: 2,
      minTimeout: 1000,
      onRetry: (err, attempt) => {
        logger.info(`Attempt ${attempt}: Retrying subscription to ${topic}...`);
      },
    },
  );
};

const eachMessage =
  (apiClient, validator) =>
  async ({ message }) => {
    let json_message = JSON.parse(message.value);

    logger.trace(`Received message: ${message.value}`);

    switch (json_message.operation) {
      case "CREATE":
        if (validator(json_message.payload)) {
          apiClient.create(null, json_message.payload);
        } else {
          logger.error(`Payload error: ${json_message.payload}`);
        }
        break;
      case "DELETE":
        apiClient.delete(json_message.id);
        break;
      case "UPDATE":
        if (validator(json_message.payload)) {
          apiClient.update(json_message.id, json_message.payload);
        } else {
          logger.error(`Payload error:  ${json_message.payload}`);
        }
        break;
    }
  };
