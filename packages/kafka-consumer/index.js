import Log4js from "log4js";

let logger = Log4js.getLogger("gridql/TestConsumer");

export class TestConsumer {
  constructor(kafka, config) {
    this.consumer = kafka.consumer(config);
  }

  init = async (topic) => {
    await this.consumer.connect();
    await this.consumer
      .subscribe({ topic, fromBeginning: true })
      .then(() => {
        logger.info("Test Consumer subscribed to ", topic);
      })
      .catch((reason) => logger.error("can't subscribe: ", reason));
  };

  run = async () => {
    logger.info(" Test Listening: ");
    await this.consumer.run({
      eachMessage: async ({ partition, message }) => {
        logger.debug("Event received: ", {
          partition,
          offset: message.offset,
          value: message.value.toString(),
        });
        this.actual = JSON.parse(message.value.toString());
      },
    });
  };

  current = async (d = 50) => {
    let loop = 0;
    while (this.actual === undefined && loop < 10) {
      await this.delay(d * loop);
      loop++;
    }
    if (this.actual === undefined) {
      logger.error("Message not recieved");
      throw "Message not received";
    }
    return this.actual;
  };

  delay = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  destroy = async () => {
    this.consumer.destroy();
  };
}
