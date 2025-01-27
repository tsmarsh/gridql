import fs from "fs";
import { JSONSchemaVisitor } from "./JSONSchemaVisitor.js";
import { GraphSchemaVisitor } from "./GraphSchemaVisitor.js";
import { ConfiguratorConfigVisitor } from "./ConfiguratorConfigVisitor.js";
import { processConfig } from "./configProcessor.js";
import { RepositoryDiagram } from "./parser.js";

/**
 * Generates JSON Schemas from the parsed CST
 */
export function processJsonSchema(ctx: any, destinationPath: string): void {
  const jsonSchemaVisitor = new JSONSchemaVisitor();
  const jsonschemas = jsonSchemaVisitor.visit(ctx);
  for (const schemaName in jsonschemas) {
    fs.writeFileSync(
      `${destinationPath}/config/json/${schemaName.toLowerCase()}.schema.json`,
      JSON.stringify(jsonschemas[schemaName], null, 2),
      "utf-8"
    );
  }
}

/**
 * Generates GraphQL Schemas from the parsed CST
 */
export function processGraphQLSchema(ctx: any, destinationPath: string): void {
  const graphSchemaVisitor = new GraphSchemaVisitor();
  const graphSchema = graphSchemaVisitor.visit(ctx);
  for (const schemaName in graphSchema) {
    fs.writeFileSync(
      `${destinationPath}/config/graph/${schemaName.toLowerCase()}.graphql`,
      graphSchema[schemaName].join("\n\n"),
      "utf-8"
    );
  }
}

/**
 * Generates a "config.conf" that details how to wire everything together
 */
export function processClusterConfig(
  ctx: any,
  host: string,
  destinationPath: string
): void {
  const configuratorConfigVisitor = new ConfiguratorConfigVisitor(host);
  fs.writeFileSync(
    `${destinationPath}/config/config.conf`,
    processConfig(configuratorConfigVisitor.visit(ctx)),
    "utf-8"
  );
}

/**
 * Orchestrates the entire transformation from .mmd -> JSON Schemas -> GraphQL Schemas -> config.conf
 */
export function merminate(
  filePath: string,
  destinationPath: string,
  url: string
): void {
  const mermaid = fs.readFileSync(filePath, { encoding: "utf-8" });

  const parser = new RepositoryDiagram();
  const ctx = parser.parseInput(mermaid);

  fs.mkdirSync(`${destinationPath}/config/graph`, { recursive: true });
  fs.mkdirSync(`${destinationPath}/config/json`, { recursive: true });

  processJsonSchema(ctx, destinationPath);
  processGraphQLSchema(ctx, destinationPath);
  processClusterConfig(ctx, url, destinationPath);
} 