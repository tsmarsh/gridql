const promiseRetry = require("promise-retry");
const { MongoClient } = require("mongodb");

const options = {
  directConnection: true,
};

const promiseRetryOptions = {
  retries: 10,
  factor: 1.5,
  minTimeout: 1000,
  maxTimeout: 5000,
};

async function buildDb(mongo) {
  let client = new MongoClient(mongo["uri"], mongo["options"]);
  promiseRetry((retry, number) => {
    console.log(
      `MongoClient connecting to ${mongo["uri"]} - retry number: ${number}`
    );
    return client.connect().catch(retry);
  }, promiseRetryOptions);

  return client.db(mongo["db"]).collection(mongo["collection"]);
}

module.exports = {
  buildDb,
};
