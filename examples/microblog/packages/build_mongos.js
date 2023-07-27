const fs = require("fs");
const path = require("path");

const configPath = process.argv[2];
const db = process.argv[3];

let output = {};

fs.readdirSync(configPath).forEach((file) => {
  if (path.extname(file) === ".json") {
    const entity = path.basename(file, ".schema.json");
    output[entity] = {
      uri: "MONGO_URI",
      collection: `${entity}`,
      db,
    };
  }
});

console.log(JSON.stringify(output, null, 2));
