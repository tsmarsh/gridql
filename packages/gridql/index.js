import {build_app} from "@gridql/server";

import {parse} from "@gridql/server/lib/config.js";
import fs from "fs";

let configPath = "./config/config.conf";
if (fs.existsSync(configPath)) {
  parse(configPath)
    .then((config) => {
      console.log("Graphlettes: ", config.graphlettes.length);
      console.log("Restlettes: ", config.restlettes.length);
      build_app(config).then((app) => app.listen(config.port));
    })
    .catch((err) => console.log("Error parsing config: ", err));
} else {
  console.log("Config missing");
}
