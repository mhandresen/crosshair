import { describe, expect, it } from "vitest";
import { configSchema } from "../src";

const valid = {
  server: { command: "node", args: ["server.js"] },
  cases: [{ name: "c1", prompt: "hi", assertions: [{ kind: "tool", tool: "x" }] }],
};

describe("configSchema", () => {
  it("accepts a well-formed config", () => {
    expect(configSchema.safeParse(valid).success).toBe(true);
  });

  it("requires a server command", () => {
    expect(configSchema.safeParse({ cases: valid.cases }).success).toBe(false);
  });

  it("rejects a case with no assertions", () => {
    const bad = { ...valid, cases: [{ name: "c1", prompt: "hi", assertions: [] }] };
    expect(configSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an unknown assertion kind", () => {
    const bad = { ...valid, cases: [{ name: "c", prompt: "p", assertions: [{ kind: "nope" }] }] };
    expect(configSchema.safeParse(bad).success).toBe(false);
  });
});