import { writeFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import {
  AnthropicAdapter,
  type CompletionResult,
  type CrosshairConfig,
  callsNoTool,
  callsTool,
  connect,
  discover,
  FileResponseCache,
  formatJUnit,
  formatLint,
  formatSampledReport,
  lintTools,
  loadCrosshairConfig,
  MockAdapter,
  type ModelAdapter,
  type ResponseCache,
  resolvePolicy,
  runSampledCase,
  type SampledCaseResult,
} from "@crosshair/core";
import pc from "picocolors";

export interface RunOptions {
  serverCommand?: string;
  serverArgs?: string[];
  strict?: boolean;
  cache?: boolean;
  junit?: string | boolean;
  adapter?: string;
}

export async function runCommand(options: RunOptions): Promise<void> {
  const { config, filepath } = await loadCrosshairConfig();
  console.log(pc.dim(`config: ${relative(process.cwd(), filepath)}`));

  const cache: ResponseCache | undefined =
    options.cache === false ? undefined : new FileResponseCache();
  const connection = await connect(resolveServer(config, options));
  try {
    const tools = await discover(connection.client);

    const findings = lintTools(tools);
    const lint = formatLint(findings);
    if (lint) console.log(lint);

    const adapter: ModelAdapter =
      options.adapter === "mock"
        ? new MockAdapter({
            respond: (req): CompletionResult => {
              const prompt = req.messages.at(-1)?.content ?? "";
              const match = config.cases.find((c) => c.prompt === prompt);
              const reply = match?.mockReply;
              return reply ? callsTool(reply.tool, reply.args) : callsNoTool();
            },
          })
        : new AnthropicAdapter(config.model ? { model: config.model } : {});
    const results: SampledCaseResult[] = [];
    for (const testCase of config.cases) {
      const policy = resolvePolicy(config.sampling, testCase.sampling);
      results.push(await runSampledCase(adapter, tools, testCase, policy, cache));
    }
    console.log(formatSampledReport(results, { title: adapter.model }));

    const cachedTotal = results.reduce((n, r) => n + r.cached, 0);
    if (cache && cachedTotal > 0)
      console.log(pc.dim(`${cachedTotal} response(s) served from cache\n`));

    const casesFailed = results.some((r) => !r.passed);
    const lintFailed = options.strict === true && findings.length > 0;

    const junitPath = options.junit === true ? "crosshair-junit.xml" : options.junit;
    if (junitPath) {
      const target = resolve(process.cwd(), junitPath);
      writeFileSync(target, formatJUnit(results, { suiteName: adapter.model }));
      console.log(pc.dim(`JUnit XML written to ${target}\n`));
    }
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
