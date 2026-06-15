import {
  AnthropicAdapter,
  type CaseResult,
  type CrosshairConfig,
  connect,
  discover,
  formatLint,
  formatReport,
  lintTools,
  loadCrosshairConfig,
  runCase,
} from "@crosshair/core";
import pc from "picocolors";

export interface RunOptions {
  serverCommand?: string;
  serverArgs?: string[];
  strict?: boolean;
}

export async function runCommand(options: RunOptions): Promise<void> {
  const { config, filepath } = await loadCrosshairConfig();
  console.log(pc.dim(`config: ${filepath}`));

  const connection = await connect(resolveServer(config, options));
  try {
    const tools = await discover(connection.client);

    const findings = lintTools(tools);
    const lint = formatLint(findings);
    if (lint) console.log(lint);

    const adapter = new AnthropicAdapter(config.model ? { model: config.model } : {});
    const results: CaseResult[] = [];
    for (const testCase of config.cases) {
      results.push(await runCase(adapter, tools, testCase));
    }

    console.log(formatReport(results, { title: adapter.model }));

    // Cases failing always fails the run; lint warnings fail only under --strict.
    const casesFailed = results.some((r) => !r.passed);
    const lintFailed = options.strict === true && findings.length > 0;
    process.exitCode = casesFailed || lintFailed ? 1 : 0;
  } finally {
    await connection.close();
  }
}

function resolveServer(config: CrosshairConfig, options: RunOptions) {
  return options.serverCommand
    ? { command: options.serverCommand, args: options.serverArgs }
    : config.server;
}