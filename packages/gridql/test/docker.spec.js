const {init, start} = require("@gridql/server");
const {swagger} = require("@gridql/server/lib/swagger");
const {OpenAPIClientAxios} = require("openapi-client-axios");
const {builderFactory} = require("@gridql/payload-generator")
const assert = require("assert");
const {GenericContainer, MongoDBContainer, Network} = require("testcontainers");

const path = require('path');

let swagger_clients = {};
let config;

before(async function () {
    this.timeout(50000);

    let configFile = __dirname + "/../config";

    const context = path.resolve(__dirname + "/../");

    const image = await GenericContainer.fromDockerfile(context).build();

    const network = await new Network().start();

    const mongodbContainer = await new MongoDBContainer("mongo:6.0.1")
        .withNetwork(network)
        .start();

    const container = await image
        .withEnvironment({
            "MONGO_URI": `mongodb://${mongodbContainer.getNetworkId(network.getName())}:27017/`
        })
        .withExposedPorts(3000)
        .withNetwork(network)
        .withBindMounts([
            {source: configFile, target: "/app/config"}
        ]).start();

    const logStream = await container.logs();
    logStream
        .on("data", (line) => console.log(line))
        .on("err", (line) => console.error(line));

    let externalURL = `http://localhost:${container.getMappedPort(3000)}`

    process.env.MONGO_URI = mongodbContainer.getConnectionString();

    config = await init(configFile + "/config.conf");

    for (let restlette of config.restlettes) {
        let swaggerdoc = swagger(restlette.path, restlette.schema, externalURL)
        let api = new OpenAPIClientAxios({definition: swaggerdoc});
        swagger_clients[restlette.path] = await api.init()
    }

});

describe("Should fire up a base config and run", function () {
    this.timeout(100000)
    it("should create a test", async () => {

        let test_factory = builderFactory(config.restlettes[0].schema)
        test = test_factory()

        const result = await swagger_clients["/test/api"].create(null, test);

        assert.equal(result.status, 200);
        assert.equal(result.data.name, test.name);
        assert(result.data._id !== undefined);
    })
});

