import { BaseCstVisitor } from "./parser.mjs";

export class JSONSchemaVisitor extends BaseCstVisitor {
  constructor() {
    super();
    this.validateVisitor();
    this.schemas = {};
  }

  statementClause(ctx) {
    ctx.classClause.map((klass) => this.classClause(klass));
    return this.schemas;
  }

  compositionClause(ctx) {
    console.log("COMPOSITION");
    console.log(
      `${ctx.children.rhs[0].image} has a ${ctx.children.lhs[0].image} `,
    );
  }

  classClause(ctx) {
    let name = ctx.children.Type[0].image;
    let schema = {
      type: "object",
      additionalProperties: false,
      required: [],
      properties: {},
    };
    this.schemas[name] = schema;
    for (let fc of ctx.children.fieldClause) {
      this.fieldClause(fc, schema);
    }
  }

  fieldClause(ctx, schema) {
    let name = ctx.children.Identifier[0].image;
    let type = this.typeClause(ctx.children.typeClause[0], schema, name);
    if (name.endsWith("_id")) {
      schema.properties[name] = { type: "string" };
    } else {
      schema.properties[name] = type;
    }
  }

  typeClause(ctx, schema, name) {
    let type;

    if ("Type" in ctx.children) {
      return { type: ctx.children.Type[0].image.toLowerCase() };
    } else if ("RequiredType" in ctx.children) {
      let image = ctx.children.RequiredType[0].image;
      let important = image.substring(0, image.length - 1).toLowerCase();
      schema.required.push(name);
      return { type: important };
    } else {
      this.arrayClause(ctx.children.arrayClause[0], schema, name);
    }
  }

  arrayClause(ctx, schema, name) {
    let value = ctx.children.Type[0].toLowerCase();
    return {
      type: "array",
      items: {
        type: value,
      },
    };
  }

  methodClause(ctx) {
    console.log("METHOD");
    console.log(JSON.stringify(ctx, null, 2));
  }

  argList(ctx) {
    console.log("ARG_LIST");
    console.log(JSON.stringify(ctx, null, 2));
  }
}
