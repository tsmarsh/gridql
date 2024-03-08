import fs from "fs";
import {GraphSchemaVisitor} from "./lib/GraphSchemaVisitor.mjs";
import {RepositoryDiagram} from "./lib/parser.mjs";
import {JSONSchemaVisitor} from "./lib/JSONSchemaVisitor.mjs";

let mermaid = fs.readFileSync("./test/test.mermaid", {encoding: 'utf-8'});

let parser = new RepositoryDiagram();
const jsonSchemaVisitor = new JSONSchemaVisitor();
const graphSchemaVisitor = new GraphSchemaVisitor();

const ctx = parser.parseInput(mermaid);
//jsonSchemaVisitor.visit(ctx);
graphSchemaVisitor.visit(ctx);
