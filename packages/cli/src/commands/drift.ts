import { relative } from "node:path";
import {
  AnthropicAdapter,
  connect,
  discover,
  FileResponseCache,
  formatDrift,
  loadCrosshairConfig,
  type ModelAdapter,
  type ResponseCache,
  resolvePolicy,
  runDrift,
} from "@crosshair/core";
import pc from "picocolors";

export interface DriftOptions {
  cache?: boolean;
}

export async function driftCommand(options: DriftOptions): Promise<void> {
  const { config, filepath } = await loadCrosshairConfig();
  console.log(pc.dim(`config: ${relative(process.cwd(), filepath)}`));

  if (!config.models || config.models.length < 2) {
    console.error("drift needs a `models` array with at least two models in your config.");
    process.exit(1);
  }

  const cache: ResponseCache | undefined =
    options.cache === false ? undefined : new FileResponseCache();
  const connection = await connect(config.server);
  try {
    const tools = await discover(connection.client);
    const adapters: ModelAdapter[] = config.models.map((m) => new AnthropicAdapter({ model: m }));
    const cases = config.cases.map((testCase) => ({
      testCase,
      policy: resolvePolicy(config.sampling, testCase.sampling),
    }));

    const report = await runDrift(adapters, tools, cases, cache);
    console.log(formatDrift(report));
    // Drift is informational — divergence isn't a build failure, it's a finding.
    process.exitCode = 0;
  } finally {
    await connection.close();
  }
}
