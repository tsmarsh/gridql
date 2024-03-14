export class KafkaCUD {
  constructor(kafkaConsumer, topic, modules) {
    this.kafkaConsumer = kafkaConsumer;
    this.topic = topic;
    this.modules = modules;
  }

  switcheroo = async ({ message }) => {
    let json_message = JSON.parse(message.value);

    switch (json_message.operation) {
      case "CREATE":
        if (Object.hasOwnProperty.call(this.modules, "create")) {
          this.modules.create.execute(json_message);
        }
        break;
      case "DELETE":
        if (Object.hasOwnProperty.call(this.modules, "delete")) {
          this.modules.delete.execute(json_message);
        }
        break;
      case "UPDATE":
        if (Object.hasOwnProperty.call(this.modules, "update")) {
          this.modules.update.execute(json_message);
        }
        break;
      default:
        throw new Error("Unsupported Operation: " + json_message);
    }
  };

  execute = async () => {
    await this.kafkaConsumer.connect();

    await this.kafkaConsumer
      .subscribe({ topic: this.topic })
      .then(() => {
        console.log("Subscribed");
      })
      .catch((reason) => console.log("can't subscribe: ", reason));

    await this.kafkaConsumer.run({
      eachMessage: this.switcheroo,
    });
  };
}
