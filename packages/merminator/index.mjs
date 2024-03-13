import {program} from "commander"
import {merminate} from "./lib/processor.mjs"



program
    .name("Mermaidinator")
    .description("Takes a mermaid classdiagram and parses it into configuration for a gridql cluster")
    .option('-f, --file <file>', 'Mermaid file')
    .option("-d, --dest <dest>", "destination path", ".")
    .option("-u, --url <url>", "internal host", "localhost:3033")
    .action((options) => merminate(options.file, options.dest, options.url))

program.parse()