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

  classClause(ctx) {
    let name = ctx.children.Type[0].image;
    let schema = {
      type: "object",
      additionalProperties: false,
      required: [],
      properties: {
        id: {
          type: "string",
          format: "uuid",
        },
      },
    };
    this.schemas[name] = schema;
    for (let fc of ctx.children.fieldClause) {
      this.fieldClause(fc, schema);
    }

    if (Object.hasOwnProperty.call(ctx.children, "annotatedFieldClause")) {
      for (let fc of ctx.children.annotatedFieldClause) {
        this.annotatedFieldClause(fc, schema);
      }
    }
  }

  fieldClause(ctx, schema) {
    let name = ctx.children.Identifier[0].image;
    let type = this.typeClause(ctx.children.typeClause[0], schema, name);
    if (name.endsWith("_id")) {
      schema.properties[name] = { type: "string", format: "uuid" };
    } else {
      if (Object.hasOwnProperty.call(ctx.children, "varList")) {
        this.varList(type, ctx.children.varList[0]);
      }
      schema.properties[name] = type;
    }
  }

  annotatedFieldClause(ctx, schema) {
    this.fieldClause(ctx, schema);
  }

  typeClause(ctx, schema, name) {
    if ("Type" in ctx.children) {
      let tipe = ctx.children.Type[0].image;
      return this.isSpecial(tipe);
    } else if ("RequiredType" in ctx.children) {
      let image = ctx.children.RequiredType[0].image;
      let important = image.substring(0, image.length - 1);
      schema.required.push(name);
      return this.isSpecial(important);
    } else {
      this.arrayClause(ctx.children.arrayClause[0], schema, name);
    }
  }

  isSpecial(tipe) {
    const special = {
      Date: { type: "string", format: "date" },
      ID: { type: "string", format: "uuid" },
      Int: { type: "integer" },
      Float: { type: "number" },
    };

    if (Object.hasOwnProperty.call(special, tipe)) {
      return special[tipe];
    } else {
      return { type: tipe.toLowerCase() };
    }
  }

  arrayClause(ctx) {
    let value = ctx.children.Type[0].toLowerCase();
    return {
      type: "array",
      items: {
        type: value,
      },
    };
  }

  methodClause() {}

  argList() {}

  varList(type, v) {
    for (let i = 0; i < v.children.Identifier.length; i++) {
      type[v.children.Identifier[i].image] = this.valueClause(
        v.children.valueClause[i],
      );
    }
  }

  valueClause(v) {
    if (Object.hasOwnProperty.call(v.children, "DoubleQuotedString")) {
      let foo = v.children.DoubleQuotedString[0].image;
      return foo.substring(1, foo.length - 1);
    } else if (Object.hasOwnProperty.call(v.children, "SingleQuotedString")) {
      let foo = v.children.SingleQuotedString[0].image;
      return foo.substring(1, foo.length - 1);
    } else {
      return parseFloat(v.children.Number[0].image);
    }
  }

  compositionClause() {}
}
