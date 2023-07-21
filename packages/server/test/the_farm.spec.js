const { after, before, describe, it } = require("mocha");
const { init, start } = require("../index");
const { callSubgraph } = require("../lib/callgraph");
const { expect } = require("chai");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { MongoClient } = require("mongodb");
const { swagger } = require("../lib/swagger");
const { default: OpenAPIClientAxios } = require("openapi-client-axios");
const assert = require("assert");

let mongod, client, uri;

before(async function () {
  mongod = await MongoMemoryServer.create({ instance: { port: 60504 } });
  client = new MongoClient(mongod.getUri());
  await client.connect();

  uri = mongod.getUri();
});

after(async function () {
  mongod.stop();
});

describe("Complex nodes", function () {
  let config;
  let server;

  let hen_api;
  let coop_api;
  let farm_api;

  let port;

  before(async function () {
    config = await init(__dirname + "/config/complex.conf");

    server = await start(
      config.url,
      config.port,
      config.graphlettes,
      config.restlettes
    );

    port = config.port;

    let swagger_docs = config.restlettes.map((restlette) => {
      return swagger(restlette.path, restlette.schema, config.url);
    });

    let apis = await Promise.all(
      swagger_docs.map(async (doc) => {
        let api = new OpenAPIClientAxios({ definition: doc });
        return await api.init();
      })
    );

    hen_api = apis[0];
    coop_api = apis[1];
    farm_api = apis[2];
  });

  it("should build a server with multiple nodes", async function () {
    let farm_id, coop1_id, coop2_id;

    try {
      let farm_1 = await farm_api.create(null, { name: "Emerdale" });
      farm_id = farm_1.request.path.slice(-36);

      let coop_1 = await coop_api.create(null, {
        name: "red",
        farm_id: `${farm_id}`,
      });

      coop1_id = coop_1.request.path.slice(-36);
      let coop_2 = await coop_api.create(null, {
        name: "yellow",
        farm_id: `${farm_id}`,
      });

      coop2_id = coop_2.request.path.slice(-36);

      await coop_api.create(null, {
        name: "pink",
        farm_id: `${farm_id}`,
      });
    } catch (err) {
      console.log("The fuck?: ", err);
    }

    let hens = [
      {
        name: "chuck",
        eggs: 2,
        coop_id: `${coop1_id}`,
      },
      {
        name: "duck",
        eggs: 0,
        coop_id: `${coop1_id}`,
      },
      {
        name: "euck",
        eggs: 1,
        coop_id: `${coop2_id}`,
      },
      {
        name: "fuck",
        eggs: 2,
        coop_id: `${coop2_id}`,
      },
    ];

    await Promise.all(hens.map((hen) => hen_api.create(null, hen)));

    const query = `{
         getById(id: "${farm_id}") {
               name 
               coops {
                name
                hens {
                  eggs
                  name
                }
               }
            }
        }`;

    const json = await callSubgraph(
      `http://localhost:${port}/farms/graph`,
      query,
      "getById"
    );

    expect(json.name).to.equal("Emerdale");

    expect(json.coops.length).to.equal(3);
  });
});
