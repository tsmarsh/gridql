const {builderFactory} = require("../index");
const assert = require("assert");

describe("creates a valid payload given a schema", function() {
    it("assumes id are mongo ids", function() {
        const schema = {
            "type": "object",
            "properties": {
                "_id": {
                    "type": "string",
                    "format": "id"
                }
            },
            "required": ["_id"],
            "additionalProperties": false
        }

        const objectId_regex = /^[a-f\d]{24}$/i

        const payload = builderFactory(schema)();

        assert(objectId_regex.test(payload._id));
    });

    it("assumes dates are iso dates", function() {

        const schema = {
            "type": "object",
            "properties": {
                "date": {
                    "type": "string",
                    "format": "date"
                },
            },
            "required": ["date"],
            "additionalProperties": false
        }

        const iso8601_regex = /\d{4}-[01]\d-[0-3]\d/

        const payload = builderFactory(schema)();

        assert(iso8601_regex.test(payload.date));
    });

    it("generates multiple payloads", function() {

        const schema = {
            "type": "object",
            "properties": {
                "date": {
                    "type": "string",
                    "format": "date"
                }
            },
            "required": ["date"],
            "additionalProperties": false
        }

        const iso8601_regex = /\d{4}-[01]\d-[0-3]\d/

        const payload = builderFactory(schema)(10);

        assert(iso8601_regex.test(payload[0].date));
        assert(iso8601_regex.test(payload[1].date));
        assert(iso8601_regex.test(payload[2].date));
    });

});