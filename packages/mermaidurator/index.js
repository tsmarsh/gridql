import fs from "fs";
import {GraphSchemaVisitor} from "./lib/GraphSchemaVisitor.mjs";
import {RepositoryDiagram} from "./lib/parser.mjs";
import {JSONSchemaVisitor} from "./lib/JSONSchemaVisitor.mjs";

let mermaid = fs.readFileSync("./test/test.mermaid", {encoding: 'utf-8'});

let parser = new RepositoryDiagram();
const graphSchemaVisitor = new JSONSchemaVisitor();

const ctx = parser.parseInput(mermaid);
graphSchemaVisitor.visit(ctx);
