import promiseRetry from "promise-retry";

import { MongoClient } from "mongodb";

import Log4js from "log4js";

let logger = Log4js.getLogger("gridql/mongo-connector");

const promiseRetryOptions = {
  retries: 10,
  factor: 1.5,
  minTimeout: 1000,
  maxTimeout: 5000,
};

export async function buildDb(mongo) {
  let client = new MongoClient(mongo["uri"], mongo["options"]);
  await promiseRetry((retry, number) => {
    logger.debug(
      `MongoClient connecting to ${mongo["uri"]} - retry number: ${number}`,
    );
    return client.connect().catch(retry);
  }, promiseRetryOptions);

  const response = await client.db("admin").command({ ping: 1 });
  logger.trace(`Ping response: ${response}`);

  return client.db(mongo["db"]).collection(mongo["collection"]);
}
