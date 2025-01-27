import { BaseCstVisitor } from "./parser.js";
import pluralize from "pluralize";

export class GraphSchemaVisitor extends BaseCstVisitor {
  constructor() {
    super();
    this.validateVisitor();
  }

  visit(ctx: any): Record<string, string[]> {
    const types: Record<string, { fields: string[]; methods: string[] }> = {};

    // gather classClause
    if (ctx.classClause) {
      ctx.classClause.forEach((cl: any) => this.classClause(cl, types));
    }
    // gather compositionClause
    if (ctx.compositionClause) {
      ctx.compositionClause.forEach((co: any) => this.compositionClause(co, types));
    }

    // convert them to lines
    const lines: Record<string, string[]> = {};
    Object.keys(types).forEach((k) => {
      const schemaLines: string[] = [];
      // define the type
      schemaLines.push(`type ${k} {\n  ${types[k].fields.join("\n  ")}\n}`);
      // define the queries
      const qLines = types[k].methods.map((m) => `  ${m}`);
      schemaLines.push(`extend type Query {\n${qLines.join("\n")}\n}`);
      lines[k] = schemaLines;
    });

    return lines;
  }

  compositionClause(ctx: any, types: Record<string, any>): Record<string, any> {
    const host = ctx.children.lhs[0].image;
    const type = ctx.children.rhs[0].image;

    const service = type.charAt(0).toLowerCase() + type.slice(1);
    const nme = pluralize(service, 2);

    // from example: types[type].methods.push(`getBy${host}(id: ID, at: Float): [${type}]`);
    if (!types[type]) {
      types[type] = { fields: [], methods: [] };
    }
    if (!types[host]) {
      types[host] = { fields: [], methods: [] };
    }
    types[type].methods.push(`getBy${host}(id: ID, at: Float): [${type}]`);
    types[host].fields.push(`${nme}: [${type}]`);
    return types;
  }

  classClause(ctx: any, types: Record<string, any>): Record<string, any> {
    const type = ctx.children.Type[0].image;
    let fields: string[] = [];
    let items: string[] = [];
    if (ctx.children.fieldClause) {
      items = ctx.children.fieldClause.map((fc: any) => this.fieldClause(fc));
    }
    fields = fields.concat(items);

    if (ctx.children.annotatedFieldClause) {
      const more = ctx.children.annotatedFieldClause.map((fc: any) => this.annotatedFieldClause(fc));
      fields = fields.concat(more);
    }
    let methods: string[] = [];
    if (ctx.children.methodClause) {
      methods = ctx.children.methodClause.map((mc: any) => this.methodClause(mc));
    }

    // default method
    methods.push(`getById(id: ID, at: Float): ${type}`);
    fields.push(`id: ID`);

    types[type] = { fields, methods };
    return types;
  }

  fieldClause(ctx: any): string {
    let name = ctx.children.Identifier[0].image;
    // if this is a field that ends with _id, remove that suffix
    if (name.endsWith("_id")) {
      name = name.slice(0, -3);
    }
    const ftype = this.typeClause(ctx.children.typeClause[0]);
    return `${name}: ${ftype}`;
  }

  annotatedFieldClause(ctx: any): string {
    return this.fieldClause(ctx);
  }

  typeClause(ctx: any): string {
    if ("Type" in ctx.children) {
      return ctx.children.Type[0].image;
    } else if ("RequiredType" in ctx.children) {
      return ctx.children.RequiredType[0].image;
    } else {
      return this.arrayClause(ctx.children.arrayClause[0]);
    }
  }

  arrayClause(ctx: any): string {
    const value = ctx.children.Type[0].image;
    return `[${value}]`;
  }

  methodClause(ctx: any): string {
    const fn = ctx.children.Identifier[0].image;
    const returnType = this.typeClause(ctx.children.typeClause[0]);
    const argList = this.argList(ctx.children.argList[0]);
    // Insert "at: Float" from original logic
    return `${fn}(${argList.join(", ")}): ${returnType}`;
  }

  argList(ctx: any): string[] {
    const arg = ctx.children.Identifier[0].image;
    const type = this.typeClause(ctx.children.typeClause[0]);
    return [`${arg}: ${type}`, "at: Float"];
  }

  varList(): void {}
  valueClause(): void {}
} 