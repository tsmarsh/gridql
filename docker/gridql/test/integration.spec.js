const {parse, build_app} = require("@gridql/server");
const {swagger} = require("@gridql/server/lib/swagger");
const {OpenAPIClientAxios} = require("openapi-client-axios");
const {builderFactory} = require("@gridql/payload-generator")
const assert = require("assert");
const {MongoMemoryServer} = require("mongodb-memory-server");


let mongod;
let server;
let swagger_clients = {};
let config;

before(async function (){
    this.timeout(10000);

    mongod = await MongoMemoryServer.create();

    process.env.MONGO_URI = mongod.getUri();

    let configFile = __dirname + "/../config/config.conf";

    config = await parse(configFile);
    let app = await build_app(config);

    server = await app.listen(config.port);

    for(let restlette of config.restlettes){
        let swaggerdoc = swagger(restlette.path, restlette.schema, config.url)
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
        assert(result.data.id !== undefined);
    })
});

