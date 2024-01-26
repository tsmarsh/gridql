const { valid } = require("../index.js");
const { builderFactory } = require("@gridql/payload-generator");
const assert = require("assert");

describe("test a payload against a schema", function () {
  it("creates a validation function from a json schema", function () {
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
        },
        displayName: {
          type: "string",
          faker: "animal.horse",
        },
        email: {
          type: "string",
          format: "email",
          faker: "internet.email",
        },
        notificationEmail: {
          type: "string",
          format: "email",
          faker: "internet.email",
        },
      },
      required: ["firstName", "lastName", "email"],
    };

    const validate = valid(schema);
    const payload = builderFactory(schema)();
    const result = validate(payload);
    assert(result);
  });

  it("the validation function fails if the doc isn't valid", function () {
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
        },
        displayName: {
          type: "string",
          faker: "animal.horse",
        },
        email: {
          type: "string",
          format: "email",
          faker: "internet.email",
        },
        notificationEmail: {
          type: "string",
          format: "email",
          faker: "internet.email",
        },
      },
      required: ["firstName", "lastName", "email"],
    };

    const validate = valid(schema);
    const payload = {};
    const result = validate(payload);
    assert(!result);
  });
});
