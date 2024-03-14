import { Kafka, logLevel } from "kafkajs";

import parser from "@pushcorn/hocon-parser";

import { OpenAPIClientAxios } from "openapi-client-axios";

import fs from "fs";

import { valid } from "@gridql/payload-validator";

import { parseUrl } from "@gridql/url";

export const init = async (configFile) => {
  const config = await parser
    .parse({ url: configFile })
    .catch((e) => console.log("Error parse config: ", e));

  console.log("Config: ", config);

  const { kafka, swagger, schema } = config;

  let k = new Kafka({
    logLevel: logLevel.INFO,
    brokers: kafka.brokers,
    clientId: kafka.clientId,
  });

  const kafkaConsumer = k.consumer({ groupId: kafka.groupId });

  let swagger_doc = JSON.parse(await parseUrl(swagger));

  console.log("Swagger doc: ", swagger_doc);

  let api = new OpenAPIClientAxios({ definition: swagger_doc });
  let apiClient = await api.init().catch((err) => {
    console.error("Failed to create client: ", err);
  });

  let validator = valid(JSON.parse(fs.readFileSync(schema, "utf-8")));

  return { apiClient, kafkaConsumer, validator, topic: kafka.topic };
};

export const start = async ({ apiClient, kafkaConsumer, validator, topic }) => {
  await kafkaConsumer.connect();

  await kafkaConsumer
    .subscribe({ topic })
    .then(() => {
      console.log("Subscribed");
    })
    .catch((reason) => console.log("can't subscribe: ", reason));

  await kafkaConsumer.run({
    eachMessage: async ({ message }) => {
      let json_message = JSON.parse(message.value);

      switch (json_message.operation) {
        case "CREATE":
          if (validator(json_message.payload)) {
            apiClient.create(null, json_message.payload);
          } else {
            console.error("Payload error: ", json_message.payload);
          }
          break;
        case "DELETE":
          apiClient.delete(json_message.id);
          break;
        case "UPDATE":
          if (validator(json_message.payload)) {
            apiClient.update(json_message.id, json_message.payload);
          } else {
            console.error("Payload error: ", json_message.payload);
          }
          break;
      }
    },
  });
};
