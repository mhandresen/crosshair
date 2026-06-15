import {
  AnthropicAdapter,
  type CaseResult,
  type CrosshairConfig,
  connect,
  discover,
  loadCrosshairConfig,
  runCase,
} from "@crosshair/core";
import pc from "picocolors";

export interface RunOptions {
  serverCommand?: string;
  serverArgs?: string[];
}

export async function runCommand(options: RunOptions): Promise<void> {
  const { config, filepath } = await loadCrosshairConfig();
  console.log(pc.dim(`config: ${filepath}`));

  const connection = await connect(resolveServer(config, options));
  try {
    const tools = await discover(connection.client);
    const adapter = new AnthropicAdapter(config.model ? { model: config.model } : {});

    const results: CaseResult[] = [];
    for (const testCase of config.cases) {
      // Sequential for now; concurrency cap + backoff is Phase 3.
      results.push(await runCase(adapter, tools, testCase));
    }

    for (const result of results) printResult(result);
    printSummary(results);
    process.exitCode = results.every((r) => r.passed) ? 0 : 1;
  } finally {
    await connection.close();
  }
}

// Config is the source of truth; a CLI server arg overrides it for ad-hoc runs.
function resolveServer(config: CrosshairConfig, options: RunOptions) {
  return options.serverCommand
    ? { command: options.serverCommand, args: options.serverArgs }
    : config.server;
}

function printResult(result: CaseResult): void {
  console.log(`${result.passed ? pc.green("PASS") : pc.red("FAIL")}  ${result.name}`);
  for (const assertion of result.assertions) {
    console.log(`  ${assertion.passed ? pc.green("✓") : pc.red("✗")} ${assertion.message}`);
  }
}

function printSummary(results: CaseResult[]): void {
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  const line = `${passed} passed${failed ? `, ${failed} failed` : ""}`;
  console.log(`\n${failed ? pc.red(line) : pc.green(line)}`);
}