#!/usr/bin/env node
import { VERSION } from "@crosshair/core";
import { cac } from "cac";
import { runCommand } from "./commands/run";

const cli = cac("crosshair");

cli
  .command(
    "run [serverCommand] [...serverArgs]",
    "Run your crosshair.config cases against an MCP server",
  )
  .option("--strict", "Treat schema-lint warnings as failures (non-zero exit)")
  .option("--no-cache", "Bypass the response cache and force fresh model calls")
  .option("--junit [file]", "Write a JUnit XML report (default: crosshair-junit.xml)")
  .action(
    (
      serverCommand: string | undefined,
      serverArgs: string[],
      options: { strict?: boolean; cache?: boolean; junit?: string | boolean },
    ) =>
      runCommand({
        serverCommand,
        serverArgs,
        strict: options.strict,
        cache: options.cache,
        junit: options.junit,
      }),
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
