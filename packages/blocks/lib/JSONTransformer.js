import jq from "node-jq";
import Log4js from "log4js";

let logger = Log4js.getLogger("gridql/JSONTransformer");

export class JSONTransformer {
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
          if (Object.hasOwnProperty.call(this.modules, "success")) {
            this.modules.success.execute(out);
          }
        } else {
          if (Object.hasOwnProperty.call(this.modules, "error")) {
            this.modules.error.execute(data);
          }
        }
      })
      .catch((err) => {
        logger.error(err);
      });
  }
}
