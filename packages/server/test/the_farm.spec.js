const { after, before, describe, it } = require("mocha");
const { init, start } = require("../index");
const { callSubgraph } = require("../lib/graph/callgraph");
const chai = require("chai");
const expect = chai.expect;
const chaiHttp = require("chai-http");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { MongoClient } = require("mongodb");
const { swagger } = require("../lib/swagger");
const { default: OpenAPIClientAxios } = require("openapi-client-axios");
const assert = require("assert");
const jwt = require("jsonwebtoken");
const { v4: uuid } = require("uuid");
const cheerio = require("cheerio");

chai.use(chaiHttp);

let mongod, client, uri;

before(async function () {
  mongod = await MongoMemoryServer.create({ instance: { port: 60504 } });
  client = new MongoClient(mongod.getUri());
  await client.connect();

  uri = mongod.getUri();
});

let config;
let server;

let hen_api;
let coop_api;
let farm_api;

let port;
let token;
let sub = uuid();

let farm_id, coop1_id, coop2_id;
let first_stamp, second_stamp;

before(async function () {
  config = await init(__dirname + "/config/the_farm.conf");

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

  token = jwt.sign({ sub }, "totallyASecret", { expiresIn: "1h" });

  let apis = await Promise.all(
      swagger_docs.map(async (doc) => {
        let api = new OpenAPIClientAxios({
          definition: doc,
          axiosConfigDefaults: {
            headers: {
              Authorization: "Bearer " + token,
            },
          },
        });
        return await api.init();
      })
  );

  hen_api = apis[0];
  coop_api = apis[1];
  farm_api = apis[2];

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

    first_stamp = Date.now();
    console.log("First stamp: ", first_stamp);

    await coop_api.update(
        { id: coop1_id },
        { name: "purple", farm_id: `${farm_id}` }
    );

    second_stamp = Date.now();
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
});

after(async function () {
  mongod.stop();
  server.close();
});

describe("Complex nodes", function () {

  it("should build a server with multiple nodes", async function () {
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
      "getById",
      "Bearer " + token
    );

    expect(json.name).to.equal("Emerdale");

    expect(json.coops.length).to.equal(3);
  });

  it("should get latest by default", async function () {
    const query = `{
         getById(id: "${coop1_id}") {
              name
         }}`;

    const json = await callSubgraph(
      `http://localhost:${port}/coops/graph`,
      query,
      "getById",
      "Bearer " + token
    );

    assert.equal(json.name, "purple");
  });

  it("should get closest to the timestamp when specified", async function () {
    const query = `{
         getById(id: "${coop1_id}", at: ${first_stamp}) {
              name
         }}`;

    const json = await callSubgraph(
      `http://localhost:${port}/coops/graph`,
      query,
      "getById",
      "Bearer " + token
    );

    assert.equal(json.name, "red");
  });

  it("should obey the timestamps", async function () {
    const query = `{
         getById(id: "${farm_id}", at: ${first_stamp}) {
               coops {
                name
               }
            }
        }`;

    const json = await callSubgraph(
      `http://localhost:${port}/farms/graph`,
      query,
      "getById",
      "Bearer " + token
    );

    let names = json.coops.map((c) => c.name);
    expect(names).to.not.contain("purple");
  });

  it("should pass timestamps to next layer", async function () {
    const query = `{
         getById(id: "${farm_id}", at: ${Date.now()}) {
               coops {
                name
               }
            }
        }`;

    const json = await callSubgraph(
      `http://localhost:${port}/farms/graph`,
      query,
      "getById",
      "Bearer " + token
    );

    let names = json.coops.map((c) => c.name);
    expect(names).to.contain("purple");
  });


  async function fetchWithRetry(url, n, retryDelay = 100) {
    let retries = 0;
    while (retries < n) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return response.text(); // or use response.text() if expecting plain text
        } else {
          throw new Error(`Received status code: ${response.status}`);
        }
      } catch (error) {
        console.error(`Error fetching URL: ${url}. Retrying...`, error);
        retries++;
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
    throw new Error(`Failed to fetch URL ${url} after ${n} retries.`);
  }

  it("should have built in documentation", async () => {
    chai
      .request(server)
      .get("/")
      .end((err, res) => {
        expect(err).to.be.null;
        expect(res).to.have.status(200);

        let $ = cheerio.load(res.text);
        let graphlettes = $("#graphlettes li");
        expect(graphlettes).to.have.length(3);
        let restlettes = $("#restlettes li");
        expect(restlettes).to.have.length(3);
      });
  });
});
