import { describe, expect, it } from "vitest";
import { type CaseResult, diffSubset, formatReport } from "../src";

const argMismatch: CaseResult = {
  name: "order status",
  passed: false,
  text: "",
  toolCalls: [{ name: "get_order_status", arguments: { order_id: "ORD-1" } }],
  assertions: [
    {
      assertion: { kind: "tool", tool: "get_order_status", args: { order_id: "ORD-9001" } },
      passed: false,
      message: "args mismatch",
    },
  ],
};

describe("formatReport", () => {
  it("renders a per-key argument diff with expected and received", () => {
    const out = formatReport([argMismatch]);
    expect(out).toContain("order_id");
    expect(out).toContain("ORD-9001");
    expect(out).toContain("ORD-1");
    expect(out).toContain("1 failed");
  });

  it("keeps a passing case to one compact line", () => {
    const pass: CaseResult = {
      name: "ok",
      passed: true,
      text: "",
      toolCalls: [{ name: "x", arguments: {} }],
      assertions: [{ assertion: { kind: "tool", tool: "x" }, passed: true, message: "called x" }],
    };
    const out = formatReport([pass]);
    expect(out).toContain("ok");
    expect(out).toContain("1 passed");
    expect(out).not.toContain("expected"); // no failure detail on a pass
  });
});

describe("diffSubset", () => {
  it("names the differing key with a dotted path", () => {
    const d = diffSubset({ user: { id: 7 } }, { user: { id: 8, name: "x" } });
    expect(d).toHaveLength(1);
    expect(d[0]?.path).toBe("user.id");
  });

  it("flags an asserted key that is absent", () => {
    const [m] = diffSubset({ order_id: "X" }, {});
    expect(m?.path).toBe("order_id");
    expect(m?.absent).toBe(true);
  });

  it("treats arrays as exact", () => {
    expect(diffSubset({ ids: [1] }, { ids: [1, 2] })).toHaveLength(1);
    expect(diffSubset({ ids: [1, 2] }, { ids: [1, 2] })).toHaveLength(0);
  });
});
