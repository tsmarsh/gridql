const {init, start} = require("@gridql/server");
const {swagger} = require("@gridql/server/lib/swagger");
const {OpenAPIClientAxios} = require("openapi-client-axios");
const {builderFactory} = require("@gridql/payload-generator")
const assert = require("assert");
const {MongoMemoryServer} = require("mongodb-memory-server");
const {GenericContainer} = require("testcontainers");

const path = require('path');


let mongod;
let server;
let swagger_clients = {};
let config;

before(async function (){
    this.timeout(50000);

    mongod = await MongoMemoryServer.create();

    let configFile = __dirname + "/../config";

    const context = path.resolve(__dirname + "/../");

    const image = await GenericContainer.fromDockerfile(context).build();
    let externalURL = "http://localhost:40404";
    const container = await image
        .withEnvironment({
            "MONGO_URI": mongod.getUri(),
        "EXTERNAL_URL": externalURL})
        .withExposedPorts({container: 3000, host: 40404})
        .withBindMounts([
            {source: configFile, target: "/app/config"}
        ]).start();

    const logStream = await container.logs();
    logStream
        .on("data", (line) => console.log(line))
        .on("err", (line) => console.error(line));
    config = await init(configFile);

    for(let restlette of config.restlettes){
        let swaggerdoc = swagger(restlette.path, restlette.schema, externalURL)
        let api = new OpenAPIClientAxios({ definition: swaggerdoc });
        swagger_clients[restlette.path] = await api.init()
    }

});

describe("Should fire up a base config and run", function(){

    it("should create a test", async () =>{

        let test_factory = builderFactory(config.restlettes[0].schema)
        test = test_factory()

        const result = await swagger_clients["/test/api"].create(null, test);

        assert.equal(result.status, 200);
        assert.equal(result.data.name, test.name);
        assert(result.data._id !== undefined);
    })
});

