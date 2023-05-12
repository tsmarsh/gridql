const assert = require("assert");
const {getSub, calculateReaders} =  require("../index")
const {buildJWT} = require("./util")


describe("authorization", function(){
    it("extracts the user_id from the jwt", function (){
        const authHeader = `Bearer ${buildJWT("IAM-A-U53R-1D")}`;
        assert.equal(getSub(authHeader), "IAM-A-U53R-1D");
    });
});

describe("readers", function (){
    it("it collects the reader from the token", function(){
        assert.deepEqual(calculateReaders({}, "IAM-A-U53R-1D"), ["IAM-A-U53R-1D"]);
    })

    it("it collects the reader from the token", function(){
        assert.deepEqual(calculateReaders({"object_id": "IAM-A-U53R-1D"}, null), ["IAM-A-U53R-1D"]);
    })

    it("it collects the reader from the document", function(){
        assert.deepEqual(calculateReaders({"object_id": "IAM-A-U53R-1D"}, "IAM-A-U53R-1D"), ["IAM-A-U53R-1D"]);
    })

    it("it does nothing", function(){
        assert.deepEqual(calculateReaders({}, null), []);
    })
})