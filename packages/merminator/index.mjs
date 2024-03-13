#!/usr/bin/env node

import { program } from "commander";
import { merminate } from "./lib/processor.mjs";
import fs from "fs";

const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf-8"));

program
  .name("Mermaidinator")
  .version(packageJson.version)
  .addHelpText(
    "after",
    `
Example call:
  $ merminator --file example.mmd --dest config --url http://localhost:3033`,
  )
  .description(
    "Takes a mermaid classdiagram and parses it into configuration for a gridql cluster",
  )
  .option("-f, --file <file>", "Mermaid file to convert. Required.")
  .option(
    "-d, --dest <dest>",
    "Destination path for the output. Defaults to the current directory.",
    ".",
  )
  .option(
    "-u, --url <url>",
    "Internal host URL. Defaults to 'localhost:3033'.",
    (value) => {
      const urlPattern = /^https?:\/\/[^\s$.?#].[^\s]*$/;
      if (!urlPattern.test(value)) {
        throw new Error("Invalid URL format");
      }
      return value;
    },
    "localhost:3033",
  )
  .action((options) => {
    if (!options.file) {
      console.error("Error: --file <file> option is required");
      process.exit(1);
    }
    merminate(options.file, options.dest, options.url);
  });

program.parse();
