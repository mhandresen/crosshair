#!/usr/bin/env node
import { VERSION } from "@crosshair/core";
import { cac } from "cac";
import { runCommand } from "./commands/run";

const cli = cac("crosshair");

cli
  .command("run <command> [...args]", "Run the built-in example case against an MCP server")
  .action((command: string, args: string[]) => runCommand(command, args));

cli.help();
cli.version(VERSION);

async function main(): Promise<void> {
  cli.parse(process.argv, { run: false });
  await cli.runMatchedCommand();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});