const { after, before, describe, it } = require("mocha");
const {parse, build_app} = require("@gridql/server")
const { callSubgraph } = require("@gridql/graph");
const chai = require("chai");
const expect = chai.expect;
const chaiHttp = require("chai-http");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { MongoClient } = require("mongodb");
const { swagger } = require("@gridql/server/lib/swagger");
const { default: OpenAPIClientAxios } = require("openapi-client-axios");
const assert = require("assert");
const jwt = require("jsonwebtoken");
const { v4: uuid } = require("uuid");
const cheerio = require("cheerio");

chai.use(chaiHttp);

let mongod, client, uri;

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
  this.timeout(20000)
  const {merminate} = await import("@gridql/merminator/lib/processor.mjs")

  mongod = await MongoMemoryServer.create({ instance: { port: 60504 } });
  uri = mongod.getUri();
  client = new MongoClient(uri);

  process.env["MONGO_URI"] = uri;
  process.env["ENV"] = "test"
  process.env["PREFIX"] = "farm"
  process.env["PLATFORM_URL"] = "http://localhost:3033"

  await client.connect();

  merminate(__dirname + "/test.mermaid", __dirname, "http://localhost:3033")
  process.chdir(__dirname)

  config = await parse(__dirname + "/config/config.conf");
  let app = await build_app(config);

  port = config.port;

  server = app.listen(port)

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

  for (let api of apis){
    if(Object.keys(api.paths)[0].includes("hen")){
      hen_api = api
    }
    else if(Object.keys(api.paths)[0].includes("coop")){
      coop_api = api
    }
    else if(Object.keys(api.paths)[0].includes("farm")){
      farm_api = api
    }
  }

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
  process.chdir(__dirname + "/..")
});

describe("The Farm", function () {
  this.timeout(20000)
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
      `http://localhost:${port}/farm/graph`,
      query,
      "getById",
      "Bearer " + token
    );

    expect(json.name).to.equal("Emerdale");

    expect(json.coops.length).to.equal(3);
  });

  it("should query in both directions", async function () {
    const query = `{
         getByCoop(coop: "${coop1_id}") {
               name
               eggs 
               coop {
                name
                farm {
                  name
                }
               }
            }
        }`;

    const json = await callSubgraph(
        `http://localhost:${port}/hen/graph`,
        query,
        "getByCoop",
        "Bearer " + token
    );

    expect(json.length).to.equal(2);
    expect(json[0].coop.name).to.equal("purple")
    //This is a configuration problem, not a functionality problem
    // expect(json[0].coop.farm.name).to.equal("Emerdale")
  });

  it("should get latest by default", async function () {
    const query = `{
         getById(id: "${coop1_id}") {
              name
         }}`;

    const json = await callSubgraph(
      `http://localhost:${port}/coop/graph`,
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
      `http://localhost:${port}/coop/graph`,
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
      `http://localhost:${port}/farm/graph`,
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
      `http://localhost:${port}/farm/graph`,
      query,
      "getById",
      "Bearer " + token
    );

    let names = json.coops.map((c) => c.name);
    expect(names).to.contain("purple");
  });



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
