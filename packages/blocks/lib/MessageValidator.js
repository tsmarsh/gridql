import Log4js from "log4js";

let logger = Log4js.getLogger("gridql/MessageValidator");

export class MessageValidator {
  constructor(validator, modules) {
    this.validator = validator;
    this.modules = modules;
  }

  execute = async (data) => {
    if (this.validator(data.payload)) {
      this.modules.success.execute(data);
    } else {
      logger.error("Invalid: " + JSON.stringify(data))
      this.modules.error.execute(data);
    }
  };
}
