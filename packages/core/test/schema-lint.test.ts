import { describe, expect, it } from "vitest";
import { type DiscoveredTool, lintTools } from "../src";

const tool = (over: Partial<DiscoveredTool>): DiscoveredTool => ({
  name: "t",
  description: "A sufficiently descriptive tool description.",
  inputSchema: { type: "object", properties: {} },
  ...over,
});

describe("lintTools", () => {
  it("flags a missing description", () => {
    const findings = lintTools([tool({ name: "a", description: undefined })]);
    expect(findings.some((f) => f.rule === "no-description" && f.tool === "a")).toBe(true);
  });

  it("flags an untyped, undescribed parameter", () => {
    const findings = lintTools([
      tool({ name: "a", inputSchema: { type: "object", properties: { q: {} } } }),
    ]);
    const rules = findings.map((f) => f.rule);
    expect(rules).toContain("untyped-param");
    expect(rules).toContain("undescribed-param");
  });

  it("flags two tools that share an identical description", () => {
    const findings = lintTools([
      tool({ name: "a", description: "Look up a thing by id." }),
      tool({ name: "b", description: "Look up a thing by id." }),
    ]);
    const dupes = findings.filter((f) => f.rule === "duplicate-description");
    expect(dupes.map((f) => f.tool).sort()).toEqual(["a", "b"]);
  });

  it("stays silent on a clean tool", () => {
    const findings = lintTools([
      tool({
        inputSchema: {
          type: "object",
          properties: { q: { type: "string", description: "the query" } },
        },
      }),
    ]);
    expect(findings).toHaveLength(0);
  });
});
