#!/usr/bin/env node
import { VERSION } from "@crosshair/core";
import { cac } from "cac";
import { initCommand } from "./commands/init";
import { lintCommand } from "./commands/lint";
import { runCommand } from "./commands/run";

const cli = cac("crosshair");

cli
  .command("init", "Scaffold a crosshair.config.ts for your MCP server")
  .action(() => initCommand());

cli
  .command(
    "run [serverCommand] [...serverArgs]",
    "Run your crosshair.config cases against an MCP server",
  )
  .option("--strict", "Treat schema-lint warnings as failures (non-zero exit)")
  .option("--no-cache", "Bypass the response cache and force fresh model calls")
  .option("--junit [file]", "Write a JUnit XML report (default: crosshair-junit.xml)")
  .option("--adapter <name>", "Adapter to use: anthropic (default) or mock") // ← registered?
  .action(
    (
      serverCommand: string | undefined,
      serverArgs: string[],
      options: { strict?: boolean; cache?: boolean; junit?: string | boolean; adapter?: string }, // ← in the type?
    ) =>
      runCommand({
        serverCommand,
        serverArgs,
        strict: options.strict,
        cache: options.cache,
        junit: options.junit,
        adapter: options.adapter,
      }),
  );

cli
  .command("lint", "Lint an MCP server's tool definitions (no model, no API key)")
  .allowUnknownOptions()
  .option("--strict", "Exit non-zero when any warnings are found")
  .action((options: { strict?: boolean }) => {
    const argv = process.argv.slice(2);
    const start = argv.indexOf("lint") + 1;
    const rest = argv.slice(start).filter((a) => a !== "--" && a !== "--strict");
    const [serverCommand, ...serverArgs] = rest;
    if (!serverCommand) {
      console.error("Usage: crosshair lint [--strict] -- <server command>");
      process.exit(1);
    }
    return lintCommand({ serverCommand, serverArgs, strict: options.strict });
  });

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
