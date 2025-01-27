#!/usr/bin/env ts-node

import { program } from "commander";
import { merminate } from "./lib/processor.js";
import Log4js from "log4js";

// Create a logger for demonstration purposes
let logger = Log4js.getLogger("gridql/aac");

program
  .name("AAC-CLI")
  .addHelpText(
    "after",
    `
Example call:
  $ aac --file example.mmd --dest config --url http://localhost:3033`
  )
  .description(
    "Takes a mermaid classdiagram and parses it into configuration for a gridql cluster (TypeScript)."
  )
  .option("-f, --file <file>", "Mermaid file to convert. Required.")
  .option(
    "-d, --dest <dest>",
    "Destination path for the output. Defaults to the current directory.",
    "."
  )
  .option(
    "-u, --url <url>",
    "Internal host URL. Defaults to 'http://localhost:3033'.",
    (value: string) => {
      const urlPattern = /^https?:\/\/[^\s$.?#].[^\s]*$/;
      if (!urlPattern.test(value)) {
        throw new Error("Invalid URL format");
      }
      return value;
    },
    "http://localhost:3033"
  )
  .action((options: any) => {
    if (!options.file) {
      logger.error("Error: --file <file> option is required");
      process.exit(1);
    }
    merminate(options.file, options.dest, options.url);
  });

program.parse(); 