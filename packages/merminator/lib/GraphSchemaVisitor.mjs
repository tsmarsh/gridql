import { BaseCstVisitor } from "./parser.mjs";
import pluralize from "pluralize";

export class GraphSchemaVisitor extends BaseCstVisitor {
  constructor() {
    super();
    this.validateVisitor();
  }

  statementClause(ctx) {
    let types = {};
    ctx.classClause.map((klass) => this.classClause(klass, types));
    ctx.compositionClause.map((comp) => this.compositionClause(comp, types));
    let files = {};

    for (let current_type in types) {
      files[current_type] = [];
      files[current_type].push("scalar Date");
      for (let type in types) {
        let fs;
        if (current_type === type) {
          files[current_type].push(
            `type Query {\n  ${types[type].methods.join("\n  ")}\n}`,
          );
          fs = types[type].fields;
        } else {
          fs = types[type].fields.filter(
            (field) => !field.includes(current_type),
          );
        }
        files[current_type].push(`type ${type} {\n  ${fs.join("\n  ")}\n}`);
      }
    }

    return files;
  }

  compositionClause(ctx, types) {
    const host = ctx.children.lhs[0].image;
    let type = ctx.children.rhs[0].image;

    const nme = pluralize(type.charAt(0).toLowerCase() + type.slice(1), 2);

    types[type].methods.push(`getBy${host}(id: ID, at: Float): [${type}]`);
    types[host].fields.push(`${nme}: [${type}]`);
    return types;
  }

  classClause(ctx, types) {
    let type = ctx.children.Type[0].image;
    let fields = ctx.children.fieldClause.map((fc) => this.fieldClause(fc));
    let methods = ctx.children.methodClause.map((mc) => this.methodClause(mc));
    methods.push(`getById(id: ID, at: Float): ${type}`);
    fields.push(`id: ID`);
    types[type] = { fields, methods };
    return types;
  }

  fieldClause(ctx) {
    let name = ctx.children.Identifier[0].image;
    if (name.endsWith("_id")) {
      name = name.slice(0, -3);
    }
    let type = this.typeClause(ctx.children.typeClause[0]);
    return `${name}: ${type}`;
  }

  typeClause(ctx) {
    if ("Type" in ctx.children) {
      return ctx.children.Type[0].image;
    } else if ("RequiredType" in ctx.children) {
      return ctx.children.RequiredType[0].image;
    } else {
      return this.arrayClause(ctx.children.arrayClause[0]);
    }
  }

  arrayClause(ctx) {
    let value = ctx.children.Type[0].image;
    return `[${value}]`;
  }

  methodClause(ctx) {
    let fn = ctx.children.Identifier[0].image;
    let returnType = this.typeClause(ctx.children.typeClause[0]);
    let argList = this.argList(ctx.children.argList[0]);
    return `${fn}(${argList.join(", ")}): ${returnType}`;
  }

  argList(ctx) {
    let arg = ctx.children.Identifier[0].image;
    let type = this.typeClause(ctx.children.typeClause[0]);

    return [`${arg}: ${type}`, "at: Float"]; //need to fix the grammar here
  }
}
