import {
  AnthropicAdapter,
  type CaseResult,
  type CrosshairConfig,
  connect,
  discover,
  formatReport,
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
      results.push(await runCase(adapter, tools, testCase));
    }

    console.log(formatReport(results, { title: adapter.model }));
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