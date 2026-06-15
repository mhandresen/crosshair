import { describe, expect, it } from "vitest";
import {
  callsTool,
  type CompletionResult,
  type DiscoveredTool,
  defineCase,
  expectTool,
  MockAdapter,
  resolvePolicy,
  runSampledCase,
} from "../src";

const tools: DiscoveredTool[] = [{ name: "get_order_status", inputSchema: { type: "object" } }];
const testCase = defineCase({
  name: "status",
  prompt: "status?",
  assertions: [expectTool("get_order_status")],
});

// Deterministically flaky: passes on a fixed subset of calls.
function flakyAdapter(passOn: boolean[]): MockAdapter {
  let i = 0;
  return new MockAdapter({
    respond: (): CompletionResult =>
      (passOn[i++] ?? false) ? callsTool("get_order_status") : callsTool("search_products"),
  });
}

describe("resolvePolicy", () => {
  it("prefers override, then global, then defaults", () => {
    expect(resolvePolicy({ samples: 10, threshold: 8 }, { threshold: 9 })).toEqual({ samples: 10, threshold: 9 });
    expect(resolvePolicy(undefined, undefined)).toEqual({ samples: 5, threshold: 4 });
  });
});

describe("runSampledCase", () => {
  it("passes when passes meet the threshold", async () => {
    const adapter = flakyAdapter([true, true, true, false, false]);
    const result = await runSampledCase(adapter, tools, testCase, { samples: 5, threshold: 3 });
    expect(result.passes).toBe(3);
    expect(result.passed).toBe(true);
  });

  it("fails when passes fall short, keeping every run", async () => {
    const adapter = flakyAdapter([true, false, false, false, false]);
    const result = await runSampledCase(adapter, tools, testCase, { samples: 5, threshold: 4 });
    expect(result.passes).toBe(1);
    expect(result.passed).toBe(false);
    expect(result.runs).toHaveLength(5);
  });
});