import assert from "assert";

export class GotIt {
  constructor(expected) {
    this.expected = expected;
  }

  called = false;

  execute = async (data) => {
    this.called = true;
    assert.equal(this.expected, data);
  };
}
