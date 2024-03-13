const assert = require("assert");

class GotIt {
  constructor(expected) {
    this.expected = expected;
  }

  called = false;

  execute = async (data) => {
    this.called = true;
    assert.equal(this.expected, data);
  };
}

module.exports = { GotIt };
