const {OpenAPIClientAxios} = require("openapi-client-axios");
const {builderFactory} = require("@gridql/payload-generator")
const assert = require("assert");

const fs = require("fs");
const {DockerComposeEnvironment} = require("testcontainers");

let swagger_clients = {};

let schema;

let environment;

before(async function () {
    this.timeout(200000);

    environment = await new DockerComposeEnvironment(__dirname , "gridql-test.yml")
        .up();

    for(let restlette of ["test"]){
        let rest = await fetch(`http://localhost:3033/${restlette}/api/api-docs/swagger.json`)
        let swaggerdoc = await rest.json();
        let api = new OpenAPIClientAxios({ definition: swaggerdoc });
        swagger_clients[`/${restlette}/api`] = await api.init()
    }

    schema = JSON.parse(fs.readFileSync(__dirname + "/builder/json/test.schema.json").toString());

});

describe("Should build docker image and run", function () {
    it("should create a test", async () => {

        let test_factory = builderFactory(schema)
        test = test_factory()

        const result = await swagger_clients["/test/api"].create(null, test);

        assert.equal(result.status, 200);
        assert.equal(result.data.name, test.name);
        assert(result.data.id !== undefined);
    })
});

