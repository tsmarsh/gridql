class ReSTFullMessage {
  constructor(apiClient, modules) {
    this.apiClient = apiClient;
    this.modules = modules;
  }

  execute = async (message) => {
    switch (message.operation) {
      case "CREATE":
        this.apiClient.create(null, message.payload);
        if (this.modules.hasOwnProperty("create")) {
          this.modules.create.execute(message);
        }
        break;
      case "DELETE":
        this.apiClient.delete(message.id);
        if (this.modules.hasOwnProperty("delete")) {
          this.modules.delete.execute(message);
        }
        break;
      case "UPDATE":
        this.apiClient.update(message.id, message.payload);
        if (this.modules.hasOwnProperty("update")) {
          this.modules.update.execute(message);
        }
        break;
      default:
        throw new Error("Unsupported Operation: " + json_message);
    }
  };
}

module.exports = { ReSTFullMessage };
