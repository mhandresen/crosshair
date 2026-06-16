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
          properties: {
            q: { type: "string", description: "the search query text to match against" },
          },
        },
      }),
    ]);
    expect(findings).toHaveLength(0);
  });
});

it("flags a required undescribed param distinctly from an optional one", () => {
  const findings = lintTools([
    tool({
      name: "a",
      inputSchema: {
        type: "object",
        properties: { id: { type: "string" }, note: { type: "string" } },
        required: ["id"],
      },
    }),
  ]);
  const rules = findings.map((f) => f.rule);
  expect(rules).toContain("required-undescribed-param"); // id is required + undescribed
  expect(rules).toContain("undescribed-param"); // note is optional + undescribed
});

it("flags a description that exists but is too thin", () => {
  const findings = lintTools([
    tool({
      name: "a",
      inputSchema: {
        type: "object",
        properties: { path: { type: "string", description: "the path" } },
      },
    }),
  ]);
  expect(findings.some((f) => f.rule === "thin-param-description")).toBe(true);
});
