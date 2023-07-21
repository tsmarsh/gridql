const { processContext } = require("./subgraph");
const { callSubgraph } = require("./callgraph");

class DTOFactory {
  resolvers = {};

  constructor(config) {
    if (config !== undefined) {
      for (const c of config) {
        this.resolvers[c.name] = assignResolver(c.id, c.queryName, c.url);
      }
    }
  }

  fillOne(data) {
    let copy = {};

    for (const f in this.resolvers) {
      if (typeof this.resolvers[f] === "function") {
        copy[f] = this.resolvers[f];
      }
    }

    assignProperties(copy, data);
    return copy;
  }

  fillMany(data) {
    return data.map((d) => this.fillOne(d));
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
    return callSubgraph(url, query, queryName);
  };
};

module.exports = {
  DTOFactory,
};
