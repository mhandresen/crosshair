import pc from "picocolors";
import type { DriftReport } from "../drift";

export function formatDrift(report: DriftReport): string {
  const lines: string[] = ["", header(report), ""];

  for (const row of report.rows) {
    const marker = row.diverged ? pc.yellow("≠") : pc.dim("=");
    const name = row.diverged ? pc.bold(row.name) : pc.dim(row.name);
    lines.push(`  ${marker} ${name}`);

    for (const model of report.models) {
      const r = row.byModel[model];
      if (!r) continue;
      const rate = `${r.passes}/${r.samples}`;
      const verdict = r.passed ? pc.green(rate) : pc.red(rate);
      lines.push(`      ${pc.dim(model.padEnd(28))} ${verdict}`);
    }
    if (row.diverged) lines.push("");
  }

  lines.push(summary(report), "");
  return lines.join("\n");
}

function header(report: DriftReport): string {
  return `${pc.bold("crosshair drift")} ${pc.dim(`· ${report.models.length} models · ${report.rows.length} cases`)}`;
}

function summary(report: DriftReport): string {
  if (report.divergedCount === 0) {
    return pc.green("no divergence — all models agree on every case");
  }
  return pc.yellow(
    `${report.divergedCount} case${report.divergedCount === 1 ? "" : "s"} diverge across models`,
  );
}
