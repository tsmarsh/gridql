import fs from "fs";
import {Lexer} from "chevrotain";
import {allTokens} from "./lib/lexer.mjs";
import {RepositoryDiagram} from "./lib/parser.mjs";

let mermaid = fs.readFileSync("./test/test.mermaid", {encoding: 'utf-8'});
const lexer = new Lexer(allTokens);
const parser = new RepositoryDiagram();
const BaseCstVisitor = parser.getBaseCstVisitorConstructor();

class GraphSchemaVisitor extends BaseCstVisitor {
    constructor() {
        super();

        this.validateVisitor()
    }

    statementClause(ctx) {
        console.log("STATEMENT")
        const compositions = ctx.compositionClause.map((cc)=> this.compositionClause(cc))
        const classes = ctx.classClause.map( (klass) => this.classClause(klass))
    }

    compositionClause(ctx) {
        console.log("COMPOSITION")
        console.log(ctx.children.lhs[0].image)
        console.log(ctx.children.rhs[0].image)
        //console.log(JSON.stringify(ctx, null, 2))
    }

    classClause(ctx) {
        console.log("CLASS")
        console.log(ctx.children.Type)
        console.log(JSON.stringify(ctx, null, 2))
    }

    fieldClause(ctx) {
        console.log("FIELD")
        console.log(JSON.stringify(ctx, null, 2))
    }

    typeClause(ctx) {
        console.log("TYPE")
        console.log(JSON.stringify(ctx, null, 2))
    }

    arrayClause(ctx) {
        console.log("ARRAY")
        console.log(JSON.stringify(ctx, null, 2))
    }

    methodClause(ctx) {
        console.log("METHOD")
        console.log(JSON.stringify(ctx, null, 2))
    }

    argList(ctx) {
        console.log("ARG_LIST")
        console.log(JSON.stringify(ctx, null, 2))
    }
}

const graphSchemaVisitor = new GraphSchemaVisitor();

function parseInput(text){
    let result = lexer.tokenize(text);
    parser.input = result.tokens
    const ctx = parser.statementClause()

    if(parser.errors.length > 0){
        console.error(JSON.stringify(parser.errors, null, 2))
        throw new Error("ERRORS!\n" + parser.errors[0].message)
    }
    return ctx;
}

const ctx = parseInput(mermaid);
graphSchemaVisitor.visit(ctx);
