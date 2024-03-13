class MessageValidator {
  constructor(validator, modules) {
    this.validator = validator;
    this.modules = modules;
  }

  execute = async (data) => {
    if (this.validator(data.payload)) {
      this.modules.success.execute(data);
    } else {
      this.modules.error.execute(data);
    }
  };
}

module.exports = { MessageValidator };
