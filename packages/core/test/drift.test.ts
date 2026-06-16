import { describe, expect, it } from "vitest";
import {
  callsTool,
  type DiscoveredTool,
  defineCase,
  expectTool,
  MockAdapter,
  resolvePolicy,
  runDrift,
} from "../src";

const tools: DiscoveredTool[] = [{ name: "right_tool", inputSchema: { type: "object" } }];
const testCase = defineCase({ name: "c", prompt: "p", assertions: [expectTool("right_tool")] });

describe("runDrift", () => {
  it("flags divergence when models disagree on the verdict", async () => {
    const good = new MockAdapter({ model: "model-good", respond: () => callsTool("right_tool") });
    const bad = new MockAdapter({ model: "model-bad", respond: () => callsTool("wrong_tool") });
    const policy = resolvePolicy({ samples: 4, threshold: 3 }, undefined);

    const report = await runDrift([good, bad], tools, [{ testCase, policy }]);

    expect(report.rows[0]?.diverged).toBe(true);
    expect(report.divergedCount).toBe(1);
    expect(report.rows[0]?.byModel["model-good"]?.passed).toBe(true);
    expect(report.rows[0]?.byModel["model-bad"]?.passed).toBe(false);
  });

  it("reports no divergence when models agree", async () => {
    const a = new MockAdapter({ model: "m-a", respond: () => callsTool("right_tool") });
    const b = new MockAdapter({ model: "m-b", respond: () => callsTool("right_tool") });
    const policy = resolvePolicy({ samples: 4, threshold: 3 }, undefined);

    const report = await runDrift([a, b], tools, [{ testCase, policy }]);

    expect(report.divergedCount).toBe(0);
    expect(report.rows[0]?.diverged).toBe(false);
  });
});
