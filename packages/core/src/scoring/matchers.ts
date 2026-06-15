export interface ExpectTool {
  kind: "tool";
  tool: string;
  args?: Record<string, unknown>;
}

export interface ExpectOneOf {
  kind: "oneOf";
  tools: string[];
}

export interface ExpectNoTool {
  kind: "noTool";
}

export type Assertion = ExpectTool | ExpectOneOf | ExpectNoTool;

export interface ExpectToolOptions {
  args?: Record<string, unknown>;
}

export function expectTool(tool: string, options: ExpectToolOptions = {}): ExpectTool {
  return { kind: "tool", tool, args: options.args };
}

export function expectOneOf(...tools: string[]): ExpectOneOf {
  return { kind: "oneOf", tools };
}

export function expectNoTool(): ExpectNoTool {
  return { kind: "noTool" };
}

// Deep partial: every key in `expected` must be present and equal in `actual`;
// extra keys in `actual` are ignored. Arrays match exactly (same length, deep per
// element) — partial array semantics are ambiguous. Primitives use Object.is.
export function matchesSubset(expected: unknown, actual: unknown): boolean {
  if (Array.isArray(expected)) {
    return (
      Array.isArray(actual) &&
      expected.length === actual.length &&
      expected.every((item, i) => matchesSubset(item, actual[i]))
    );
  }
  if (isPlainObject(expected)) {
    return (
      isPlainObject(actual) &&
      Object.entries(expected).every(([k, v]) => matchesSubset(v, actual[k]))
    );
  }
  return Object.is(expected, actual);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
