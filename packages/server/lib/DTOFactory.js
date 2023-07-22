const { processContext } = require("./subgraph");
const { callSubgraph } = require("./callgraph");
const { visitWithTypeInfo, TypeInfo } = require("graphql/utilities");
const { visit } = require("graphql/language");
const { parse, print } = require("graphql");

class DTOFactory {
  resolvers = {};

  constructor(config) {
    if (config !== undefined) {
      for (const c of config) {
        this.resolvers[c.name] = assignResolver(c.id, c.queryName, c.url);
      }
    }
  }

  fillOne(data, authHeader, timestamp) {
    let copy = { _authHeader: authHeader, _timestamp: timestamp };

    for (const f in this.resolvers) {
      if (typeof this.resolvers[f] === "function") {
        copy[f] = this.resolvers[f];
      }
    }

    assignProperties(copy, data);
    return copy;
  }

  fillMany(data, authHeader, timestamp) {
    return data.map((d) => this.fillOne(d, authHeader, timestamp));
  }
}

const assignProperties = (target, source) => {
  Object.keys(source).forEach((key) => {
    target[key] = source[key];
  });
};

const assignResolver = (id = "id", queryName, url) => {
  return async function (parent, args, context) {
    let foreignKey = this[id];
    const query = processContext(foreignKey, context, queryName);
    let ast = parse(query);
    const typeInfo = new TypeInfo(context.schema);
    let _timestamp = this._timestamp;
    ast = visit(
      ast,
      visitWithTypeInfo(typeInfo, {
        Field(node) {
          if (node.name.value === queryName) {
            if (!node.arguments.some((arg) => arg.name.value === "at")) {
              return {
                ...node,
                arguments: [
                  ...node.arguments,
                  {
                    kind: "Argument",
                    name: { kind: "Name", value: "at" },
                    value: { kind: "IntValue", value: String(_timestamp) },
                  },
                ],
              };
            }
          }
        },
      })
    );

    const modifiedQuery = print(ast);

    let header =
      typeof this._authHeader === "undefined" ? undefined : this._authHeader;
    return callSubgraph(url, modifiedQuery, queryName, header);
  };
};

module.exports = {
  DTOFactory,
};
