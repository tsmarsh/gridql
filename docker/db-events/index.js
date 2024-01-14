const { init, start } = require("@gridql/mongo-event-builder");

const fs = require("fs");

let configPath = "./config/config.conf";

if (fs.existsSync(configPath)) {
  init(configPath)
    .then((config) => {
      console.log("Configuration found: ", config);
      const { collection, kafkaProducer, topic } = config;
      start({ collection, kafkaProducer, topic, id: "_id" }).catch((err) => {
        console.log("Failed to start: ", err);
      });
    })
    .catch((err) => console.log("Error parsing config: ", err));
} else {
  console.log("Config missing");
}
