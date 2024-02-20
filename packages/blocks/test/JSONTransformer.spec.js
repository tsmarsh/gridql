const {MessageValidator} = require("../lib/MessageValidator");
const {valid} = require("@gridql/payload-validator")
const {GotIt} = require("./GotIt");

const assert = require("assert");
const {JSONTransformer} = require("../lib/JSONTransformer");

describe("should validate the data", async function () {
    it("should call the success module if the json is valid", async () => {
        const expected = {
            payload: {
                success: true,
                message: "So Cool!"
            }
        }

        const gotIt = new GotIt("So Cool!");
        const jt = new JSONTransformer(".payload.message", {success: gotIt});
        await jt.execute(expected);

        assert(gotIt.called)

    })

    it("should call the failure module if the json is valid", async () => {
        const expected = {
            payload: {
                fusseff: true,
                message: "So Cool!"
            }
        }

        const gotIt = new GotIt(expected);
        const jt = new JSONTransformer(".payload.success", {error: gotIt});
        await jt.execute(expected);

        assert(gotIt.called)

    })
})