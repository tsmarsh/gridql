const {MessageValidator} = require("../../lib/MessageValidator");
const {valid} = require("@gridql/payload-validator")
const {GotIt} = require("./GotIt");

const assert = require("assert");

const validator = valid({
    "$schema": "http://json-schema.org/draft-04/schema#",
    "type": "object",
    "properties": {
        "success": {
            "type": "boolean"
        },
        "message": {
            "type": "string"
        }
    },
    "required": [
        "success",
        "message"
    ]
})

describe("should validate the data", async function (){
    it("should call the success module if the json is valid", async () => {
        const expected = {
            success: true,
            message: "So Cool!"
        }

        const gotIt = new GotIt(expected);
        const mv = new MessageValidator(validator, {success: gotIt});
        await mv.execute(expected);

        assert(gotIt.called)

    })

    it("should call the failure module if the json is valid", async () => {
        const expected = {
            fusseff: true,
            message: "So Cool!"
        }

        const gotIt = new GotIt(expected);
        const mv = new MessageValidator(validator, {error: gotIt});
        await mv.execute(expected);

        assert(gotIt.called)

    })
})