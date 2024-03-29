import { parseUrl } from "../index.js";

import assert from "assert";

import { describe, it } from "mocha";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("reading uri", async function () {
  it("should read a test file", async () => {
    const actual = await parseUrl(`file:///${__dirname}/test.txt`);
    assert.equal("Hello, World!", actual);
  });

  it("should read a url", async () => {
    let actual = await parseUrl(
      "https://gist.githubusercontent.com/tsmarsh/9366736ca47ebc68d297e2b1987e9cd6/raw/5b9024e8d452da1a365fd378c0698b77601f97f8/hello.txt",
    );
    assert.equal("Hello, World!", actual);
  });
});
