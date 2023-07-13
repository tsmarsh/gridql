const { Kafka, logLevel } = require("kafkajs");
const parser = require("@pushcorn/hocon-parser");
const OpenAPIClientAxios = require("openapi-client-axios").default;
const fs = require("fs");

const init = async (configFile) => {
  const config = await parser
    .parse({ url: configFile })
    .catch((e) => console.log("Error parse config: ", e));

  console.log("Config: ", config);

  const { kafka, swagger } = config;

  let k = new Kafka({
    logLevel: logLevel.INFO,
    brokers: kafka.brokers,
    clientId: kafka.clientId,
  });

  const kafkaConsumer = k.consumer({ groupId: kafka.groupId });

  let swagger_doc = JSON.parse(fs.readFileSync(swagger).toString());
  let api = new OpenAPIClientAxios({ definition: swagger_doc });
  let apiClient = await api.init();

  return { apiClient, kafkaConsumer, topic: kafka.topic };
};

const start = async ({ apiClient, kafkaConsumer, topic }) => {
  await kafkaConsumer.connect();

  await kafkaConsumer
    .subscribe({ topic, fromBeginning: true })
    .then(() => {
      console.log("Subscribed");
    })
    .catch((reason) => console.log("can't subscribe: ", reason));

  await kafkaConsumer.run({
    eachMessage: async ({ message }) => {
      let json_message = JSON.parse(message.value);

      switch (json_message.operation) {
        case "CREATE":
          apiClient.create(null, json_message.value);
          break;
        case "DELETE":
          apiClient.delete(json_message._id);
          break;
        case "UPDATE":
          apiClient.update(json_message._id, json_message.value);
          break;
      }
    },
  });
};

module.exports = { init, start };
