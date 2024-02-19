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
    const query = processContext(
      foreignKey,
      context,
      queryName,
      this._timestamp
    );
    let header =
      typeof this._authHeader === "undefined" ? undefined : this._authHeader;
    return callSubgraph(url, query, queryName, header);
  };
};

module.exports = {
  DTOFactory,
};
