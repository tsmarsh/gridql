import { BaseCstVisitor } from "./parser.mjs";
import pluralize from "pluralize";

export class ConfiguratorConfigVisitor extends BaseCstVisitor {
  constructor(host = "http://localhost:3033") {
    super();
    this.host = host;
    this.validateVisitor();
  }

  graphUrl(node) {
    return `${this.host}/${node}/graph`;
  }

  getById = {
    name: "getById",
    id: "id",
    query: '{"id": "${id}"}',
  };

  getByX(x) {
    let type = x.slice("getBy".length);

    return `{"payload.${type.charAt(0).toLowerCase() + type.slice(1)}": "\${id}"}`;
  }

  getByXid(x) {
    let type = x.slice("getBy".length);

    return `{"payload.${type.charAt(0).toLowerCase() + type.slice(1)}_id": "\${id}"}`;
  }

  statementClause(ctx) {
    let types = {};
    ctx.classClause.map((klass) => this.classClause(klass, types));
    ctx.compositionClause.map((comp) => this.compositionClause(comp, types));

    return types;
  }

  compositionClause(ctx, types) {
    const host = ctx.children.lhs[0].image;
    let type = ctx.children.rhs[0].image;

    let service = type.charAt(0).toLowerCase() + type.slice(1);
    const nme = pluralize(service, 2);

    types[type.toLowerCase()].scalars.push({
      name: `getBy${host}`,
      id: "id",
      query: `{"payload.${host.charAt(0).toLowerCase() + host.slice(1)}_id": "\${id}"}`,
    });
    types[host.toLowerCase()].resolvers.push({
      name: nme,
      id: "id",
      queryName: "getBy" + host,
      url: this.graphUrl(service),
    });
    return types;
  }

  classClause(ctx, types) {
    let dtoConfig = { fields: [], singletons: [], scalars: [], resolvers: [] };

    let type = ctx.children.Type[0].image.toLowerCase();

    ctx.children.fieldClause.map((fc) => this.fieldClause(fc, dtoConfig));
    ctx.children.methodClause.map((mc) => this.methodClause(mc, dtoConfig));

    dtoConfig.singletons.push(this.getById);
    delete dtoConfig.fields;
    types[type] = dtoConfig;
    return types;
  }

  fieldClause(ctx, dto) {
    let name = ctx.children.Identifier[0].image;
    if (name.endsWith("_id")) {
      let service = name.substring(0, name.length - 3);
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

  typeClause(ctx) {
    if ("Type" in ctx.children) {
      return ctx.children.Type[0].image;
    } else if ("RequiredType" in ctx.children) {
      return ctx.children.RequiredType[0].image;
    } else {
      return this.arrayClause(ctx.children.arrayClause[0]);
    }
  }

  returnTypeClause(ctx, fn, id, dtoConfig) {
    if ("Type" in ctx.children) {
      dtoConfig.singletons.push({
        name: fn,
        id: id,
        query: this.getByX(fn),
      });
      return ctx.children.Type[0].image;
    } else if ("arrayClause" in ctx.children) {
      dtoConfig.scalars.push({
        name: fn,
        id: id,
        query: dtoConfig.fields.includes(id)
          ? `{"payload.${id}": "\${id}"}`
          : this.getByXid(fn),
      });
    }

    return dtoConfig;
  }

  arrayClause(ctx) {
    let value = ctx.children.Type[0].image;
    return `[${value}]`;
  }

  methodClause(ctx, dtoConfig) {
    let fn = ctx.children.Identifier[0].image;
    let id = this.argList(ctx.children.argList[0]);
    return this.returnTypeClause(ctx.children.typeClause[0], fn, id, dtoConfig);
  }

  argList(ctx) {
    return ctx.children.Identifier[0].image;
  }
}
