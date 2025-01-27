import { BaseCstVisitor } from "./parser.js";
import pluralize from "pluralize";

/**
 * In TypeScript, we add some minimal type annotations.
 */
interface DtoConfig {
  fields: string[];
  singletons: Array<{ name: string; id?: string; query?: string }>;
  vectors: Array<{ name: string; query: string }>;
  resolvers: Array<{
    name: string;
    id: string;
    queryName: string;
    url: string;
  }>;
}

export class ConfiguratorConfigVisitor extends BaseCstVisitor {
  host: string;

  constructor(host = "http://localhost:3033") {
    super();
    this.host = host;
    this.validateVisitor();
  }

  graphUrl(node: string): string {
    return `${this.host}/${node}/graph`;
  }

  getById = {
    name: "getById",
    query: '{"id": "{{id}}"}',
  };

  getByX(x: string): string {
    const type = x.slice("getBy".length);
    return `{"payload.${type.charAt(0).toLowerCase() + type.slice(1)}": "{{id}}"}`;
  }

  getByXid(x: string): string {
    const type = x.slice("getBy".length);
    return `{"payload.${type.charAt(0).toLowerCase() + type.slice(1)}_id": "{{id}}"}`;
  }

  statementClause(ctx: any): Record<string, DtoConfig> {
    const types: Record<string, DtoConfig> = {};
    ctx.classClause.forEach((klass: any) => this.classClause(klass, types));
    ctx.compositionClause.forEach((comp: any) => this.compositionClause(comp, types));
    return types;
  }

  compositionClause(ctx: any, types: Record<string, DtoConfig>): Record<string, DtoConfig> {
    const host = ctx.children.lhs[0].image;
    const type = ctx.children.rhs[0].image;

    const service = type.charAt(0).toLowerCase() + type.slice(1);
    const nme = pluralize(service, 2);

    types[type.toLowerCase()].vectors.push({
      name: `getBy${host}`,
      query: `{"payload.${host.charAt(0).toLowerCase() + host.slice(1)}_id": "{{id}}"}`,
    });
    types[host.toLowerCase()].resolvers.push({
      name: nme,
      queryName: "getBy" + host,
      url: this.graphUrl(service),
    });
    return types;
  }

  classClause(ctx: any, types: Record<string, DtoConfig>): Record<string, DtoConfig> {
    const dtoConfig: DtoConfig = {
      fields: [],
      singletons: [],
      vectors: [],
      resolvers: [],
    };

    const type: string = ctx.children.Type[0].image.toLowerCase();

    ctx.children.fieldClause.forEach((fc: any) => this.fieldClause(fc, dtoConfig));
    if (Object.hasOwnProperty.call(ctx.children, "annotatedFieldClause")) {
      ctx.children.annotatedFieldClause.forEach((fc: any) => this.annotatedFieldClause(fc, dtoConfig));
    }
    if (Object.hasOwnProperty.call(ctx.children, "methodClause")) {
      ctx.children.methodClause.forEach((mc: any) => this.methodClause(mc, dtoConfig));
    }

    // Add "getById" as a default
    dtoConfig.singletons.push(this.getById);

    // We remove the 'fields' array, as in the original code
    delete dtoConfig.fields;

    types[type] = dtoConfig;
    return types;
  }

  fieldClause(ctx: any, dto: DtoConfig): void {
    const name: string = ctx.children.Identifier[0].image;
    if (name.endsWith("_id")) {
      const service = name.substring(0, name.length - 3);
      dto.resolvers.push({
        name: service,
        id: name,
        queryName: "getById",
        url: this.graphUrl(service),
      });
    } else {
      dto.fields.push(name);
    }
  }

  annotatedFieldClause(ctx: any, dto: DtoConfig): void {
    this.fieldClause(ctx, dto);
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

  returnTypeClause(
    ctx: any,
    fn: string,
    id: string,
    dtoConfig: DtoConfig
  ): string | DtoConfig {
    if ("Type" in ctx.children) {
      dtoConfig.singletons.push({
        name: fn,
        id: id,
        query: this.getByX(fn),
      });
      return ctx.children.Type[0].image;
    } else if ("arrayClause" in ctx.children) {
      dtoConfig.vectors.push({
        name: fn,
        query: dtoConfig.fields?.includes(id)
          ? `{"payload.${id}": "{{${id}}}"}`
          : this.getByXid(fn),
      });
    }
    return dtoConfig;
  }

  arrayClause(ctx: any): string {
    const value = ctx.children.Type[0].image;
    return `[${value}]`;
  }

  methodClause(ctx: any, dtoConfig: DtoConfig): any {
    const fn = ctx.children.Identifier[0].image;
    const id = this.argList(ctx.children.argList[0]);
    return this.returnTypeClause(ctx.children.typeClause[0], fn, id, dtoConfig);
  }

  argList(ctx: any): string {
    return ctx.children.Identifier[0].image;
  }

  // No-ops from the original:
  varList(): void {}
  valueClause(): void {}
} 