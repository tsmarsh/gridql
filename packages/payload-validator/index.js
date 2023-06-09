const {Validator} = require("jsonschema")

const valid = (schema) => {
    const v = new Validator();

    return function(payload) {
        const result = v.validate(payload, schema)
        if(result.valid){
            return true;
        }else{
            console.log(result.errors);
            return false;
        }
    }};

module.exports = {
    valid
}