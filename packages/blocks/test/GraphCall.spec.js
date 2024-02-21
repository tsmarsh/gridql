const {GraphCall} = require("../lib/GraphCall");
const assert = require("assert");
const fetchMock = require("fetch-mock");
const {GotIt} = require("./GotIt");

describe("Should create a query from a template and forward the results", async function () {
    const data = {
        farm_id: "diddly squat",
        time: 12952932
    }

    const template = '{\n' +
        '         getById(id: "${farm_id}", at: ${time}) {\n' +
        '               name \n' +
        '               coops {\n' +
        '                name\n' +
        '                hens {\n' +
        '                  eggs\n' +
        '                  name\n' +
        '                }\n' +
        '               }\n' +
        '            }\n' +
        '        }'

    it("should fill in a query template", async () => {
        const gc = new GraphCall(null, null, template, null);

        const result = gc.fillTemplate(data);

        const expected = '{\n' +
            '         getById(id: "diddly squat", at: 12952932) {\n' +
            '               name \n' +
            '               coops {\n' +
            '                name\n' +
            '                hens {\n' +
            '                  eggs\n' +
            '                  name\n' +
            '                }\n' +
            '               }\n' +
            '            }\n' +
            '        }'

        assert.equal(expected, result);
    })

    let body = '{getById(id: "bob"){name}}';

    it("should call the url and return the data", async ()=> {
        fetchMock.post("http://testgraph.test", {data: {"name": "diddly squat"}});

        const gc = new GraphCall("http://testgraph.test", null, null, {});

        const result = await gc.callServer(body);
        assert.equal(result, "{\"data\":{\"name\":\"diddly squat\"}}")
        fetchMock.reset();
    })

    it("should call the url and forward and error", async ()=> {
        //fetchMock.mock("http://testgraph.test", 502);

        const g = new GotIt(body);

        const gc = new GraphCall("http://testgraph.test", null, null, {"servererror": g});

        const result = await gc.callServer(body);
        assert(g.called);
        fetchMock.reset();
    })

    it("should parse out the data and return the json", async ()=> {
        fetchMock.post("http://testgraph.test", {data: {"getByName": {"name": "diddly squat"}}});

        const g = new GotIt({"name": "diddly squat"});

        const gc = new GraphCall("http://testgraph.test", "getByName", template, {"success": g});

        await gc.execute(data);

        assert(g.called);
        fetchMock.reset();
    })

    it("should pass to error if the response isn't json", async ()=> {
        fetchMock.post("http://testgraph.test", "definitely not json");

        const g = new GotIt(data);

        const gc = new GraphCall("http://testgraph.test", "getByName", template, {"error": g});

        await gc.execute(data);

        assert(g.called);
        fetchMock.reset();
    })
})