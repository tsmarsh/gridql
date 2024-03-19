import fs from "fs";
import { init, start } from "@gridql/kafka-event-consumer";

const configPath = "./config/config.conf";

if (fs.existsSync(configPath)) {
  init(configPath)
    .then((config) => {
      console.log("Configuration found: ", config);
      start(config).catch((err) => {
        console.log("Failed to start: ", err);
      });
    })
    .catch((err) => console.log("Error parsing config: ", err));
} else {
  console.log("Config missing");
}
