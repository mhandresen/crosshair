import type { ModelAdapter } from "../adapters";
import type { DiscoveredTool } from "../client";
import { DEFAULT_SAMPLES, DEFAULT_THRESHOLD } from "../config/schema";
import { type Case, type CaseResult, runCase } from "./run-case";

export interface SamplingPolicy {
  samples: number;
  threshold: number;
}

export interface SampledCaseResult {
  name: string;
  passed: boolean;
  passes: number;
  samples: number;
  threshold: number;
  // Every run kept, so a flaky case can show its failing samples in the report.
  runs: CaseResult[];
}

export function resolvePolicy(
  global: Partial<SamplingPolicy> | undefined,
  override: Partial<SamplingPolicy> | undefined,
): SamplingPolicy {
  return {
    samples: override?.samples ?? global?.samples ?? DEFAULT_SAMPLES,
    threshold: override?.threshold ?? global?.threshold ?? DEFAULT_THRESHOLD,
  };
}

export async function runSampledCase(
  adapter: ModelAdapter,
  tools: DiscoveredTool[],
  testCase: Case,
  policy: SamplingPolicy,
): Promise<SampledCaseResult> {
  const runs: CaseResult[] = [];
  for (let i = 0; i < policy.samples; i++) {
    // Sequential for now; concurrency + backoff is the next slice. Caching will
    // make repeat samples of an unchanged case effectively free.
    runs.push(await runCase(adapter, tools, testCase));
  }

  const passes = runs.filter((run) => run.passed).length;
  return {
    name: testCase.name,
    passed: passes >= policy.threshold,
    passes,
    samples: policy.samples,
    threshold: policy.threshold,
    runs,
  };
}