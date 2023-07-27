const fs = require("fs");
const path = require("path");

const configPath = process.argv[2];

let output = [];

fs.readdirSync(configPath).forEach((file) => {
  if (path.extname(file) === ".json") {
    const entity = path.basename(file, ".schema.json");
    output.push({
      path: `/${entity}/api`,
      mongo: `mongos.${entity}`,
      schema: `${configPath}/${file}`,
    });
  }
});

console.log(JSON.stringify(output, null, 2));
