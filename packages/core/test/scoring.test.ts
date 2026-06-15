import { describe, expect, it } from "vitest";
import {
  type CompletionResult,
  expectNoTool,
  expectOneOf,
  expectTool,
  matchesSubset,
  scoreCase,
} from "../src";

function resultWith(
  ...toolCalls: { name: string; arguments?: Record<string, unknown> }[]
): CompletionResult {
  return {
    toolCalls: toolCalls.map((c) => ({ name: c.name, arguments: c.arguments ?? {} })),
    text: "",
    stopReason: "tool_use",
  };
}

describe("expectTool", () => {
  it("passes on the right tool", () => {
    const [r] = scoreCase(resultWith({ name: "get_order_status" }), [
      expectTool("get_order_status"),
    ]);
    expect(r?.passed).toBe(true);
  });

  it("matches a subset of arguments", () => {
    const result = resultWith({
      name: "get_order_status",
      arguments: { order_id: "ORD-1", locale: "en" },
    });
    const [r] = scoreCase(result, [
      expectTool("get_order_status", { args: { order_id: "ORD-1" } }),
    ]);
    expect(r?.passed).toBe(true);
  });

  it("fails with a legible reason when an asserted argument differs", () => {
    const result = resultWith({ name: "get_order_status", arguments: { order_id: "ORD-2" } });
    const [r] = scoreCase(result, [
      expectTool("get_order_status", { args: { order_id: "ORD-1" } }),
    ]);
    expect(r?.passed).toBe(false);
    expect(r?.message).toContain("args mismatch");
  });
});

describe("expectOneOf", () => {
  it("passes when any acceptable tool is called", () => {
    const [r] = scoreCase(resultWith({ name: "search_products" }), [
      expectOneOf("search_products", "search_catalog"),
    ]);
    expect(r?.passed).toBe(true);
  });

  it("fails when none match", () => {
    const [r] = scoreCase(resultWith({ name: "cancel_order" }), [
      expectOneOf("search_products", "search_catalog"),
    ]);
    expect(r?.passed).toBe(false);
  });
});

describe("expectNoTool (the guardrail)", () => {
  it("passes when the model calls nothing", () => {
    const [r] = scoreCase(resultWith(), [expectNoTool()]);
    expect(r?.passed).toBe(true);
  });

  it("fails when a destructive tool is called anyway", () => {
    const [r] = scoreCase(resultWith({ name: "cancel_order" }), [expectNoTool()]);
    expect(r?.passed).toBe(false);
    expect(r?.message).toContain("expected no tool call");
  });
});

describe("matchesSubset", () => {
  it("ignores extra keys but requires asserted ones", () => {
    expect(matchesSubset({ a: 1 }, { a: 1, b: 2 })).toBe(true);
    expect(matchesSubset({ a: 1, c: 3 }, { a: 1, b: 2 })).toBe(false);
  });

  it("recurses into nested objects", () => {
    expect(matchesSubset({ user: { id: 7 } }, { user: { id: 7, name: "x" } })).toBe(true);
  });

  it("matches arrays exactly", () => {
    expect(matchesSubset({ ids: [1, 2] }, { ids: [1, 2] })).toBe(true);
    expect(matchesSubset({ ids: [1] }, { ids: [1, 2] })).toBe(false);
  });
});
