const {KafkaCUD} = require("../lib/KafkaCUD");
const assert = require("assert");
const {GotIt} = require("./GotIt");

describe("switching on operation type", async function(){
    it("should forward on create", async () => {
        const message = {
            operation: "CREATE",
            payload: {success: true}
        }
        const next = new GotIt(message);

        const cuddy = new KafkaCUD(null, null, {create: next});
        await cuddy.switcheroo({message: {value: JSON.stringify(message)}});
        assert(next.called)

    });
    it("should forward on delete", async () => {
        const message = {
            operation: "DELETE",
            payload: {success: true}
        }
        const next = new GotIt(message);

        const cuddy = new KafkaCUD(null, null, {delete: next});
        await cuddy.switcheroo({message: {value: JSON.stringify(message)}});
        assert(next.called)
    });

    it("should forward on update",async () => {
        const message = {
            operation: "UPDATE",
            payload: {success: true}
        }
        const next = new GotIt(message);

        const cuddy = new KafkaCUD(null, null, {update: next});
        await cuddy.switcheroo({message: {value: JSON.stringify(message)}});
        assert(next.called)
    } );

    it("shouldn't freak out if there isn't a module for the verb", async () => {
        const message = {
            operation: "CREATE",
            payload: {success: true}
        }
        const next = new GotIt(message);

        const cuddy = new KafkaCUD(null, null, {delete: next});
        await cuddy.switcheroo({message: {value: JSON.stringify(message)}});
        assert(!next.called)
    })
})