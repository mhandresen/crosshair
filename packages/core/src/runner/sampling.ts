import type { CompletionRequest, CompletionResult, ModelAdapter } from "../adapters";
import { type ResponseCache, requestCacheKey } from "../cache";
import type { DiscoveredTool } from "../client";
import { DEFAULT_SAMPLES, DEFAULT_THRESHOLD } from "../config/schema";
import { type Case, type CaseResult, buildRequest, scoreCompletion } from "./run-case";

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
  cached: number; // how many of the N samples were served from cache
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
  cache?: ResponseCache,
): Promise<SampledCaseResult> {
  const request = buildRequest(tools, testCase);
  const { completions, cached } = await sampleCompletions(adapter, request, policy.samples, cache);
  const runs = completions.map((completion) => scoreCompletion(testCase, completion));
  const passes = runs.filter((run) => run.passed).length;

  return {
    name: testCase.name,
    passed: passes >= policy.threshold,
    passes,
    samples: policy.samples,
    threshold: policy.threshold,
    cached,
    runs,
  };
}

async function sampleCompletions(
  adapter: ModelAdapter,
  request: CompletionRequest,
  samples: number,
  cache?: ResponseCache,
): Promise<{ completions: CompletionResult[]; cached: number }> {
  const key = cache ? requestCacheKey(adapter, request) : undefined;
  const existing = cache && key ? cache.get(key) ?? [] : [];
  const results = [...existing];

  // Only draw the shortfall — a cache with 3 draws and a request for 5 makes 2 calls.
  while (results.length < samples) {
    results.push(stripRaw(await adapter.complete(request)));
  }
  if (cache && key && results.length > existing.length) cache.set(key, results);

  return { completions: results.slice(0, samples), cached: Math.min(existing.length, samples) };
}

// The provider's native payload is huge and only useful live; never persist it.
function stripRaw(result: CompletionResult): CompletionResult {
  return { toolCalls: result.toolCalls, text: result.text, stopReason: result.stopReason };
}