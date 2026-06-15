#!/usr/bin/env node
import { VERSION } from "@crosshair/core";
import { cac } from "cac";
import { runCommand } from "./commands/run";

const cli = cac("crosshair");

cli
  .command("run [serverCommand] [...serverArgs]", "Run your crosshair.config cases against an MCP server")
  .action((serverCommand: string | undefined, serverArgs: string[]) =>
    runCommand({ serverCommand, serverArgs }),
  );

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