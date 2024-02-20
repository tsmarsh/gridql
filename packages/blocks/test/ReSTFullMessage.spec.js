const {ReSTFullMessage} = require("../lib/ReSTFullMessage");
const assert = require("assert");
const {GotIt} = require("./GotIt");

class FakeClient {
    called = false
    constructor(id, payload) {
        this.id = id;
        this.payload = payload;
    }

    async create(id, payload){
        this.called = "create";
        assert.equal(this.payload, payload);
    }

    async delete(id) {
        this.called = "delete";
        assert.equal(this.id, id)
    }
    
    async update(id, payload){
        this.called = "update"
        assert.equal(this.id, id);
        assert.equal(this.payload, payload)
    }
}

describe("will take a message and forward it to a repository object", async function(){
    it("should call create", async ()=>{
        const message = {
            operation: "CREATE",
            payload: {success: true}
        }

        const fc = new FakeClient(null, {success: true})
        let next = new GotIt(message);
        const rfm = new ReSTFullMessage(fc, {create: next});

        await rfm.execute(message);
        assert(next.called);
        assert.equal(fc.called, "create")
    });

    it("should call update", async ()=>{
        const message = {
            operation: "UPDATE",
            id: "twifty",
            payload: {success: true}
        }

        const fc = new FakeClient("twifty", {success: true})
        let next = new GotIt(message);
        const rfm = new ReSTFullMessage(fc, {update: next});

        await rfm.execute(message);
        assert(next.called);
        assert.equal(fc.called, "update")
    });

    it("should call delete", async ()=>{
        const message = {
            operation: "DELETE",
            id: "twofty"
        }

        const fc = new FakeClient("twofty", {success: true})
        let next = new GotIt(message);
        const rfm = new ReSTFullMessage(fc, {delete: next});

        await rfm.execute(message);
        assert(next.called);
        assert.equal(fc.called, "delete")
    });
});