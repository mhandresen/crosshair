import { describe, expect, it } from "vitest";
import {
  callsNoTool,
  callsTool,
  type DiscoveredTool,
  defineCase,
  expectTool,
  MockAdapter,
  runCase,
} from "../src";

const tools: DiscoveredTool[] = [
  { name: "search_products", inputSchema: { type: "object" } },
  { name: "get_order_status", inputSchema: { type: "object" } },
];

const statusCase = defineCase({
  name: "order status",
  prompt: "status of ORD-1?",
  assertions: [expectTool("get_order_status")],
});

describe("runCase", () => {
  it("passes when the model calls the expected tool", async () => {
    const adapter = new MockAdapter({
      respond: () => callsTool("get_order_status", { order_id: "ORD-1" }),
    });
    const result = await runCase(adapter, tools, statusCase);

    expect(result.passed).toBe(true);
    expect(result.assertions[0]?.message).toContain("get_order_status");
  });

  it("fails with a legible reason on the wrong tool", async () => {
    const adapter = new MockAdapter({ respond: () => callsTool("search_products") });
    const result = await runCase(adapter, tools, statusCase);

    expect(result.passed).toBe(false);
    expect(result.assertions[0]?.message).toBe("expected get_order_status, got search_products");
  });

  it("fails when the model calls no tool at all", async () => {
    const adapter = new MockAdapter({ respond: () => callsNoTool("I can't help with that.") });
    const result = await runCase(adapter, tools, statusCase);

    expect(result.passed).toBe(false);
    expect(result.assertions[0]?.message).toBe("expected get_order_status, got no tool call");
  });
});
