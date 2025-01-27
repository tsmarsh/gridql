import { BaseCstVisitor } from "./parser.js";

export class JSONSchemaVisitor extends BaseCstVisitor {
  constructor() {
    super();
    this.validateVisitor();
  }

  visit(ctx: any): Record<string, any> {
    // We assume a top-level statementClause from "parser.ts"
    // We'll gather schemas for each class found in the input.
    const schemas: Record<string, any> = {};
    if (ctx.classClause) {
      ctx.classClause.forEach((clause: any) => {
        this.classClause(clause, schemas);
      });
    }
    return schemas;
  }

  classClause(ctx: any, schemas: Record<string, any>): void {
    const name = ctx.children.Type[0].image;
    const schema = {
      $schema: "http://json-schema.org/draft-07/schema#",
      title: name,
      type: "object",
      properties: {} as Record<string, any>,
      required: [] as string[]
    };

    // gather fields
    if (ctx.children.fieldClause) {
      ctx.children.fieldClause.forEach((fc: any) => this.fieldClause(fc, schema));
    }
    if (ctx.children.annotatedFieldClause) {
      ctx.children.annotatedFieldClause.forEach((fc: any) => this.annotatedFieldClause(fc, schema));
    }

    schemas[name] = schema;
  }

  fieldClause(ctx: any, schema: any): void {
    const name = ctx.children.Identifier[0].image;
    const type = this.typeClause(ctx.children.typeClause[0], schema, name);

    if (name.endsWith("_id")) {
      // foreign reference
      schema.properties[name] = { type: "string", format: "uuid" };
    } else {
      if (Object.hasOwnProperty.call(ctx.children, "varList")) {
        this.varList(type, ctx.children.varList[0]);
      }
      schema.properties[name] = type;
    }
  }

  annotatedFieldClause(ctx: any, schema: any): void {
    this.fieldClause(ctx, schema);
  }

  typeClause(ctx: any, schema: any, name: string): any {
    if ("Type" in ctx.children) {
      const tipe = ctx.children.Type[0].image;
      return this.isSpecial(tipe);
    } else if ("RequiredType" in ctx.children) {
      const imageString = ctx.children.RequiredType[0].image;
      const important = imageString.substring(0, imageString.length - 1);
      schema.required.push(name);
      return this.isSpecial(important);
    } else {
      return this.arrayClause(ctx.children.arrayClause[0]);
    }
  }

  isSpecial(tipe: string): any {
    const special: Record<string, any> = {
      Date: { type: "string", format: "date" },
      ID: { type: "string", format: "uuid" },
      Int: { type: "integer" },
      Float: { type: "number" }
    };
    if (special[tipe]) {
      return special[tipe];
    }
    return { type: tipe.toLowerCase() };
  }

  arrayClause(ctx: any): any {
    const value = ctx.children.Type[0].image.toLowerCase();
    return {
      type: "array",
      items: {
        type: value
      }
    };
  }

  // methodClause, argList omitted from the original
  methodClause(): void {}
  argList(): void {}

  varList(type: any, v: any): void {
    for (let i = 0; i < v.children.Identifier.length; i++) {
      const key = v.children.Identifier[i].image;
      type[key] = this.valueClause(v.children.valueClause[i]);
    }
  }

  valueClause(v: any): string | number {
    if (v.children.DoubleQuotedString) {
      const str = v.children.DoubleQuotedString[0].image;
      return str.substring(1, str.length - 1);
    } else if (v.children.SingleQuotedString) {
      const str = v.children.SingleQuotedString[0].image;
      return str.substring(1, str.length - 1);
    } else {
      return parseFloat(v.children.Number[0].image);
    }
  }

  compositionClause(): void {}
} 