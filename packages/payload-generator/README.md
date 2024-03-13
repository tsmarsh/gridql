# Payload Generator

## Usage

```js
const { builderFactory } = require("@gridql/payload-generator");

const schema = {
  type: "object",
  properties: {
    _id: {
      type: "string",
      format: "id",
    },
  },
  required: ["_id"],
  additionalProperties: false,
};

const bf = builderFactory(schema);

let testThing = bf();

let manyThings = bf(1000);
```

Check out the tests for other ideas.
