import { describe, expect, it } from "vitest";
import {
  type DiscoveredTool,
  MemoryResponseCache,
  callsTool,
  defineCase,
  expectTool,
  MockAdapter,
  runSampledCase,
} from "../src";

const tools: DiscoveredTool[] = [{ name: "x", inputSchema: { type: "object" } }];
const testCase = defineCase({ name: "c", prompt: "p", assertions: [expectTool("x")] });

function countingAdapter() {
  let calls = 0;
  const adapter = new MockAdapter({
    respond: () => {
      calls++;
      return callsTool("x");
    },
  });
  return { adapter, calls: () => calls };
}

describe("response cache", () => {
  it("serves repeat samples from cache, making no new model calls", async () => {
    const cache = new MemoryResponseCache();
    const { adapter, calls } = countingAdapter();

    const first = await runSampledCase(adapter, tools, testCase, { samples: 5, threshold: 3 }, cache);
    expect(calls()).toBe(5);
    expect(first.cached).toBe(0);

    const second = await runSampledCase(adapter, tools, testCase, { samples: 5, threshold: 3 }, cache);
    expect(calls()).toBe(5); // zero new calls
    expect(second.cached).toBe(5);
    expect(second.passed).toBe(true);
  });

  it("busts the cache when a tool definition changes", async () => {
    const cache = new MemoryResponseCache();
    const { adapter, calls } = countingAdapter();

    await runSampledCase(adapter, tools, testCase, { samples: 3, threshold: 2 }, cache);
    expect(calls()).toBe(3);

    const changed: DiscoveredTool[] = [{ name: "x", description: "now described", inputSchema: { type: "object" } }];
    await runSampledCase(adapter, changed, testCase, { samples: 3, threshold: 2 }, cache);
    expect(calls()).toBe(6); // changed tools → new key → fresh calls
  });

  it("draws only the delta when sample count increases", async () => {
    const cache = new MemoryResponseCache();
    const { adapter, calls } = countingAdapter();

    await runSampledCase(adapter, tools, testCase, { samples: 3, threshold: 2 }, cache);
    expect(calls()).toBe(3);

    await runSampledCase(adapter, tools, testCase, { samples: 5, threshold: 2 }, cache);
    expect(calls()).toBe(5); // 3 reused + 2 new
  });
});