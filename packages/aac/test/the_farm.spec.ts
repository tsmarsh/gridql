import { describe, it, before } from "mocha";
import { expect } from "chai";
import { merminate } from "../lib/processor.js";
import fs from "fs";
import path from "path";

/**
 * Example test in TypeScript. This doesn't replicate every test from your original,
 * but shows how you might adapt.
 */
describe("AAC: The Farm Test (Example)", () => {
  const testDir = path.join(__dirname);
  const destDir = path.join(testDir, "outConfig");

  before(() => {
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir);
    }
  });

  it("should parse a simple mermaid file and produce config", async () => {
    const mermaidPath = path.join(testDir, "test.mermaid");
    merminate(mermaidPath, destDir, "http://localhost:3033");
    // Validate results
    expect(fs.existsSync(path.join(destDir, "config", "config.conf"))).to.be.true;
  });
}); 