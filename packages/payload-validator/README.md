# Payload Validator

All this does is wrap json-schema. We just needed the same function in multiple modules.

## Usage

```js
    const {valid} = require("@gridql/payload-validator");

    const schema = {
      type: "object",
      properties: {
        object_id: {
          type: "string",
          format: "uuid",
        },
        firstName: {
          type: "string",
          faker: "name.firstName",
        },
        lastName: {
          type: "string",
          faker: "name.lastName",
        }
      },
      required: ["firstName", "lastName",],
    };

    const valid = valid(schema);
    
    if(valid(payload)){
        ...
    }
```

See tests for more complex examples.