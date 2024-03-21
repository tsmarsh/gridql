import { Validator } from "jsonschema";

import Log4js from "log4js";

let logger = Log4js.getLogger("gridql/payload-validator");

export const valid = (schema) => {
  const v = new Validator();

  return function (payload) {
    const result = v.validate(payload, schema);
    if (result.valid) {
      return true;
    } else {
      logger.error(JSON.stringify(result.errors));
      return false;
    }
  };
};
