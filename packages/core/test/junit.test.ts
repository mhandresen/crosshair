import { describe, expect, it } from "vitest";
import { type SampledCaseResult, formatJUnit } from "../src";

function sampled(over: Partial<SampledCaseResult>): SampledCaseResult {
  return { name: "case", passed: true, passes: 5, samples: 5, threshold: 4, cached: 0, runs: [], ...over };
}

describe("formatJUnit", () => {
  it("reports suite-level counts", () => {
    const xml = formatJUnit([sampled({}), sampled({ name: "b", passed: false, passes: 1 })]);
    expect(xml).toContain(`tests="2"`);
    expect(xml).toContain(`failures="1"`);
  });

  it("self-closes a pass and emits <failure> with the rate for a fail", () => {
    const fail = sampled({
      name: "wrong tool",
      passed: false,
      passes: 2,
      runs: [
        {
          name: "wrong tool",
          passed: false,
          toolCalls: [],
          text: "",
          assertions: [{ assertion: { kind: "tool", tool: "x" }, passed: false, message: "expected x, got y" }],
        },
      ],
    });
    const xml = formatJUnit([fail]);
    expect(xml).toContain("<failure");
    expect(xml).toContain("2/5");
    expect(xml).toContain("expected x, got y");
  });

  it("escapes XML special characters in names", () => {
    const xml = formatJUnit([sampled({ name: `a & b <c> "d"` })]);
    expect(xml).toContain(`a &amp; b &lt;c&gt; &quot;d&quot;`);
    expect(xml).not.toContain("<c>");
  });
});