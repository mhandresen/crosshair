import type { SampledCaseResult } from "../runner";

// Distinct failure messages across the failing samples, ranked by frequency.
// Shared by every reporter so a flaky case is summarized identically everywhere.
export function aggregateFailures(result: SampledCaseResult): [string, number][] {
  const reasons = new Map<string, number>();
  for (const run of result.runs) {
    if (run.passed) continue;
    for (const assertion of run.assertions) {
      if (!assertion.passed)
        reasons.set(assertion.message, (reasons.get(assertion.message) ?? 0) + 1);
    }
  }
  return [...reasons.entries()].sort((a, b) => b[1] - a[1]);
}
