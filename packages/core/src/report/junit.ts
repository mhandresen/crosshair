import type { SampledCaseResult } from "../runner";
import { aggregateFailures } from "./failures";

export interface JUnitOptions {
  suiteName?: string;
}

export function formatJUnit(results: SampledCaseResult[], options: JUnitOptions = {}): string {
  const suite = options.suiteName ?? "crosshair";
  const tests = results.length;
  const failures = results.filter((r) => !r.passed).length;

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<testsuites tests="${tests}" failures="${failures}">`,
    `  <testsuite name="${attr(suite)}" tests="${tests}" failures="${failures}" time="0">`,
    ...results.map((result) => renderCase(suite, result)),
    `  </testsuite>`,
    `</testsuites>`,
    "",
  ].join("\n");
}

function renderCase(suite: string, result: SampledCaseResult): string {
  const open = `    <testcase classname="${attr(suite)}" name="${attr(result.name)}" time="0"`;
  if (result.passed) return `${open} />`;

  const summary = `${result.passes}/${result.samples} passed, need ${result.threshold}`;
  const detail = aggregateFailures(result)
    .map(([message, count]) => `${count}× ${message}`)
    .join("\n");
  const body = `${result.passes}/${result.samples} samples passed (need ${result.threshold})\n${detail}`;

  return [
    `${open}>`,
    `      <failure message="${attr(summary)}" type="assertion">${text(body)}</failure>`,
    `    </testcase>`,
  ].join("\n");
}

// XML escaping is not optional here — assertion messages carry tool names and JSON
// args full of quotes and braces. Unescaped, they'd produce malformed XML that no
// CI parser can read, turning a real failure into a silent no-result.
function text(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function attr(value: string): string {
  return text(value).replace(/"/g, "&quot;");
}