const { init, start } = require("@gridql/kafka-event-consumer/index");

const fs = require("fs");

let configPath = "./config/config.conf";

if (fs.existsSync(configPath)) {
  init(configPath)
    .then((config) => {
      console.log("Configuration found: ", config);
      start(config).catch((err) => {
        console.log("Failed to start: ", err);
      });
    })
    .catch((err) => console.log("Error parsing builder: ", err));
} else {
  console.log("Config missing");
}
