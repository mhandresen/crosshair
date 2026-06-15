import { describe, expect, it } from "vitest";
import { callsTool, type CompletionRequest, type DiscoveredTool, MockAdapter } from "../src";

const tools: DiscoveredTool[] = [
  { name: "search_products", inputSchema: { type: "object" } },
  { name: "get_order_status", inputSchema: { type: "object" } },
];

describe("MockAdapter", () => {
  it("captures the tool call its responder decides on", async () => {
    const adapter = new MockAdapter({
      respond: (req: CompletionRequest) =>
        req.messages.at(-1)?.content.includes("order")
          ? callsTool("get_order_status", { order_id: "ORD-9001" })
          : callsTool("search_products"),
    });

    const result = await adapter.complete({
      messages: [{ role: "user", content: "What's the status of order ORD-9001?" }],
      tools,
    });

    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]?.name).toBe("get_order_status");
    expect(result.toolCalls[0]?.arguments).toEqual({ order_id: "ORD-9001" });
  });
});