const { Kafka, logLevel } = require("kafkajs");
const parser = require("@pushcorn/hocon-parser");
const OpenAPIClientAxios = require("openapi-client-axios").default;
const fs = require("fs");
const { valid } = require("@gridql/payload-validator");
const {parseUrl} = require("@gridql/url");

const init = async (configFile) => {
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
  let api = new OpenAPIClientAxios({ definition: swagger_doc });
  let apiClient = await api.init();

  let validator = valid(JSON.parse(fs.readFileSync(schema)));

  return { apiClient, kafkaConsumer, validator, topic: kafka.topic };
};

const start = async ({ apiClient, kafkaConsumer, validator, topic }) => {
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

module.exports = { init, start };
