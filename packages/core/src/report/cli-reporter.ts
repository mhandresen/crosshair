import pc from "picocolors";
import type { ToolCall } from "../adapters";
import type { CaseResult } from "../runner";
import type { AssertionResult } from "../scoring";
import type { LintFinding } from "../client";
import type { SampledCaseResult } from "../runner";
import { aggregateFailures } from "./failures";

export interface ReportOptions {
  title?: string;
}

export interface Mismatch {
  path: string;
  expected: unknown;
  received: unknown;
  absent: boolean; // the asserted key was missing from the actual call entirely
}

const INDENT = "      ";

export function formatReport(results: CaseResult[], options: ReportOptions = {}): string {
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  const lines: string[] = ["", header(results.length, options.title), ""];

  for (const result of results) {
    lines.push(caseLine(result));
    if (!result.passed) {
      for (const assertion of result.assertions) {
        if (!assertion.passed) lines.push(...failureDetail(assertion, result.toolCalls));
      }
      lines.push("");
    }
  }

  lines.push(summary(passed, failed), "");
  return lines.join("\n");
}

function header(count: number, title?: string): string {
  const scope = `${count} case${count === 1 ? "" : "s"}${title ? ` · ${title}` : ""}`;
  return `${pc.bold("crosshair")} ${pc.dim(scope)}`;
}

function caseLine(result: CaseResult): string {
  return result.passed
    ? `  ${pc.green("✓")} ${pc.dim(result.name)}`
    : `  ${pc.red("✗")} ${pc.red(result.name)}`;
}

function failureDetail(assertion: AssertionResult, toolCalls: ToolCall[]): string[] {
  const a = assertion.assertion;
  switch (a.kind) {
    case "tool": {
      const match = toolCalls.find((call) => call.name === a.tool);
      if (match && a.args) {
        return [
          `${INDENT}${pc.dim("called")} ${a.tool}${pc.dim(", but arguments differ:")}`,
          ...diffSubset(a.args, match.arguments).map(argLine),
        ];
      }
      return expectedReceived(a.tool, toolCalls);
    }
    case "oneOf":
      return expectedReceived(`one of [${a.tools.join(", ")}]`, toolCalls);
    case "noTool":
      return expectedReceived("no tool call", toolCalls);
  }
}

function expectedReceived(expected: string, toolCalls: ToolCall[]): string[] {
  return [
    `${INDENT}${pc.dim("expected")}  ${expected}`,
    `${INDENT}${pc.dim("received")}  ${received(toolCalls)}`,
  ];
}

function argLine(m: Mismatch): string {
  const got = m.absent ? pc.yellow("(absent)") : fmt(m.received);
  return `${INDENT}  ${pc.cyan(m.path)}  ${pc.dim("expected")} ${fmt(m.expected)}  ${pc.dim("received")} ${got}`;
}

function received(calls: ToolCall[]): string {
  if (calls.length === 0) return pc.yellow("no tool call");
  return calls.map((call) => `${call.name}(${fmt(call.arguments)})`).join(", ");
}

function summary(passed: number, failed: number): string {
  const text = `${passed} passed${failed ? `, ${failed} failed` : ""}`;
  return pc.bold(failed ? pc.red(text) : pc.green(text));
}

function fmt(value: unknown): string {
  return JSON.stringify(value) ?? String(value);
}

// Mirrors matchesSubset's semantics (objects recurse, arrays match exactly), but
// *explains* a failure instead of judging it: returns the offending keys with a
// dotted path, expected vs. received. Kept separate from the boolean matcher so
// the scorer's hot path stays allocation-free.
export function diffSubset(expected: unknown, actual: unknown, path = ""): Mismatch[] {
  const at = path || "(root)";

  if (Array.isArray(expected)) {
    const equal =
      Array.isArray(actual) &&
      expected.length === actual.length &&
      expected.every((v, i) => diffSubset(v, actual[i]).length === 0);
    return equal ? [] : [{ path: at, expected, received: actual, absent: false }];
  }

  if (isPlainObject(expected)) {
    if (!isPlainObject(actual)) return [{ path: at, expected, received: actual, absent: false }];
    const out: Mismatch[] = [];
    for (const [key, value] of Object.entries(expected)) {
      const childPath = path ? `${path}.${key}` : key;
      if (!(key in actual)) {
        out.push({ path: childPath, expected: value, received: undefined, absent: true });
      } else {
        out.push(...diffSubset(value, actual[key], childPath));
      }
    }
    return out;
  }

  return Object.is(expected, actual)
    ? []
    : [{ path: at, expected, received: actual, absent: false }];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function formatLint(findings: LintFinding[]): string {
  if (findings.length === 0) return "";
  const lines = ["", pc.bold(pc.yellow(`schema-lint · ${findings.length} warning${findings.length === 1 ? "" : "s"}`)), ""];
  for (const f of findings) {
    lines.push(`  ${pc.yellow("⚠")} ${pc.cyan(f.tool)} ${pc.dim(`[${f.rule}]`)} ${f.message}`);
  }
  return lines.join("\n");
}

export function formatSampledReport(results: SampledCaseResult[], options: ReportOptions = {}): string {
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  const lines: string[] = ["", header(results.length, options.title), ""];

  for (const result of results) {
    lines.push(sampledLine(result));
    if (!result.passed) {
      lines.push(...sampledFailureDetail(result));
      lines.push("");
    }
  }

  lines.push(summary(passed, failed), "");
  return lines.join("\n");
}

function sampledLine(result: SampledCaseResult): string {
  const rate = `${result.passes}/${result.samples}`;
  const need = pc.dim(`(need ${result.threshold})`);
  return result.passed
    ? `  ${pc.green("✓")} ${pc.dim(result.name)}  ${pc.dim(rate)} ${need}`
    : `  ${pc.red("✗")} ${pc.red(result.name)}  ${pc.yellow(rate)} ${need}`;
}

function sampledFailureDetail(result: SampledCaseResult): string[] {
  return aggregateFailures(result).map(([message, count]) => `${INDENT}${pc.dim(`${count}×`)} ${message}`);
}