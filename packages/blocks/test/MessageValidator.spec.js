import {MessageValidator} from "../lib/MessageValidator";

import {valid} from "@gridql/payload-validator";

import {GotIt} from "./GotIt";

import assert from "assert";

const validator = valid({
  $schema: "http://json-schema.org/draft-04/schema#",
  type: "object",
  properties: {
    success: {
      type: "boolean",
    },
    message: {
      type: "string",
    },
  },
  required: ["success", "message"],
});

describe("should validate the data", async function () {
  it("should call the success module if the json is valid", async () => {
    const expected = {
      payload: {
        success: true,
        message: "So Cool!",
      },
    };

    const gotIt = new GotIt(expected);
    const mv = new MessageValidator(validator, { success: gotIt });
    await mv.execute(expected);

    assert(gotIt.called);
  });

  it("should call the failure module if the json is valid", async () => {
    const expected = {
      payload: {
        fusseff: true,
        message: "So Cool!",
      },
    };

    const gotIt = new GotIt(expected);
    const mv = new MessageValidator(validator, { error: gotIt });
    await mv.execute(expected);

    assert(gotIt.called);
  });
});
