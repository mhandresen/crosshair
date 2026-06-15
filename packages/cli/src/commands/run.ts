import {
  AnthropicAdapter,
  type CrosshairConfig,
  connect,
  discover,
  formatLint,
  formatSampledReport,
  lintTools,
  loadCrosshairConfig,
  resolvePolicy,
  runSampledCase,
  type SampledCaseResult,
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
    const results: SampledCaseResult[] = [];
    for (const testCase of config.cases) {
      const policy = resolvePolicy(config.sampling, testCase.sampling);
      results.push(await runSampledCase(adapter, tools, testCase, policy));
    }

    console.log(formatSampledReport(results, { title: adapter.model }));

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