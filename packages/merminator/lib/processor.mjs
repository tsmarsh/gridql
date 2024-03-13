import { JSONSchemaVisitor } from "./JSONSchemaVisitor.mjs";
import fs from "fs";
import { GraphSchemaVisitor } from "./GraphSchemaVisitor.mjs";
import { ConfiguratorConfigVisitor } from "./ConfiguratorConfigVisitor.mjs";
import { processConfig } from "./configProcessor.mjs";
import { RepositoryDiagram } from "./parser.mjs";

export function processJsonSchema(ctx, destinationPath) {
  const jsonSchemaVisitor = new JSONSchemaVisitor();
  let jsonschemas = jsonSchemaVisitor.visit(ctx);
  for (let schema in jsonschemas) {
    fs.writeFileSync(
      `${destinationPath}/config/json/${schema.toLowerCase()}.schema.json`,
      JSON.stringify(jsonschemas[schema], null, 2),
    );
  }
}

export function processGraphQLSchema(ctx, destinationPath) {
  const graphSchemaVisitor = new GraphSchemaVisitor();
  let graphSchema = graphSchemaVisitor.visit(ctx);
  for (let schema in graphSchema) {
    fs.writeFileSync(
      `${destinationPath}/config/graph/${schema.toLowerCase()}.graphql`,
      graphSchema[schema].join("\n\n"),
    );
  }
}

export function processClusterConfig(ctx, host, destinationPath) {
  const configuratorConfigVisitor = new ConfiguratorConfigVisitor(host);
  fs.writeFileSync(
    `${destinationPath}/config/config.conf`,
    processConfig(configuratorConfigVisitor.visit(ctx)),
  );
}

export const merminate = (filePath, destinationPath, url) => {
  let mermaid = fs.readFileSync(filePath, { encoding: "utf-8" });

  let parser = new RepositoryDiagram();

  const ctx = parser.parseInput(mermaid);

  fs.mkdirSync(destinationPath + "/config/graph", { recursive: true });
  fs.mkdirSync(destinationPath + "/config/json", { recursive: true });
  processJsonSchema(ctx, destinationPath);
  processGraphQLSchema(ctx, destinationPath);
  processClusterConfig(ctx, url, destinationPath);
};
