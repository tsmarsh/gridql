// index.d.ts
declare module "@gridql/kafka-event-consumer" {
  import { Consumer } from "kafkajs";
  import { OpenAPIClient } from "openapi-client-axios";

  type ValidatorFunction = (data: any) => boolean;

  interface Config {
    kafka: {
      brokers: string[];
      clientId: string;
      groupId: string;
      topic: string;
    };
    swagger: string;
    schema: string;
  }

  interface StartOptions {
    apiClient: OpenAPIClient;
    kafkaConsumer: Consumer;
    validator: ValidatorFunction;
    topic: string;
  }

  export function init(configFile: string): Promise<StartOptions>;

  export function start(params: StartOptions): Promise<void>;
}
