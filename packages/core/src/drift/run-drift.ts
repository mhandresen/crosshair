import type { ModelAdapter } from "../adapters";
import type { ResponseCache } from "../cache";
import type { DiscoveredTool } from "../client";
import type { Case } from "../runner";
import { runSampledCase, type SampledCaseResult, type SamplingPolicy } from "../runner";

export interface DriftCaseRow {
  name: string;
  // Keyed by model id, in the order models were given.
  byModel: Record<string, SampledCaseResult>;
  diverged: boolean;
}

export interface DriftReport {
  models: string[];
  rows: DriftCaseRow[];
  divergedCount: number;
}

export async function runDrift(
  adapters: ModelAdapter[],
  tools: DiscoveredTool[],
  cases: { testCase: Case; policy: SamplingPolicy }[],
  cache?: ResponseCache,
): Promise<DriftReport> {
  const models = adapters.map((a) => a.model);
  const rows: DriftCaseRow[] = [];

  for (const { testCase, policy } of cases) {
    const byModel: Record<string, SampledCaseResult> = {};
    for (const adapter of adapters) {
      byModel[adapter.model] = await runSampledCase(adapter, tools, testCase, policy, cache);
    }
    // Divergence = the models don't agree on pass/fail for this case. That's the
    // signal a user cares about: "this case behaves differently across models."
    const verdicts = adapters.map((a) => byModel[a.model]?.passed);
    const diverged = new Set(verdicts).size > 1;
    rows.push({ name: testCase.name, byModel, diverged });
  }

  return { models, rows, divergedCount: rows.filter((r) => r.diverged).length };
}
