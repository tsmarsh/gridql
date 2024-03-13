const jq = require("node-jq");

class JSONTransformer {
  constructor(filter, modules, options = { input: "json" }) {
    this.filter = filter;
    this.modules = modules;
    this.options = options;
  }

  async execute(data) {
    return jq
      .run(this.filter, data, this.options)
      .then((out) => {
        if (out !== "null" && out !== null) {
          if (this.modules.hasOwnProperty("success")) {
            this.modules.success.execute(out);
          }
        } else {
          if (this.modules.hasOwnProperty("error")) {
            this.modules.error.execute(data);
          }
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }
}

module.exports = { JSONTransformer };
