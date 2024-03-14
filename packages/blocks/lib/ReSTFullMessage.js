export class ReSTFullMessage {
  constructor(apiClient, modules) {
    this.apiClient = apiClient;
    this.modules = modules;
  }

  execute = async (message) => {
    switch (message.operation) {
      case "CREATE":
        this.apiClient.create(null, message.payload);
        if (Object.hasOwnProperty.call(this.modules, "create")) {
          this.modules.create.execute(message);
        }
        break;
      case "DELETE":
        this.apiClient.delete(message.id);
        if (Object.hasOwnProperty.call(this.modules, "delete")) {
          this.modules.delete.execute(message);
        }
        break;
      case "UPDATE":
        this.apiClient.update(message.id, message.payload);
        if (Object.hasOwnProperty.call(this.modules, "update")) {
          this.modules.update.execute(message);
        }
        break;
      default:
        throw new Error("Unsupported Operation: " + message);
    }
  };
}
