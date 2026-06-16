import type { DiscoveredTool } from "./discover";

export type LintSeverity = "warn" | "error";

export interface LintFinding {
  rule: string;
  severity: LintSeverity;
  tool: string;
  message: string;
}

const MIN_DESCRIPTION_LENGTH = 10;

// Each rule inspects the tool surface the *model* sees and flags what tends to
// cause misselection. Pure and offline — no model, no network. Rules are small
// and independent so adding one is a localized change.
export function lintTools(tools: DiscoveredTool[]): LintFinding[] {
  const findings: LintFinding[] = [];
  for (const tool of tools) {
    findings.push(...lintDescription(tool));
    findings.push(...lintParameters(tool));
  }
  findings.push(...lintCollisions(tools));
  return findings;
}

function lintDescription(tool: DiscoveredTool): LintFinding[] {
  const description = tool.description?.trim() ?? "";
  if (description === "") {
    return [
      finding(
        "no-description",
        "warn",
        tool.name,
        "has no description — the model has only the name to go on",
      ),
    ];
  }
  if (description.length < MIN_DESCRIPTION_LENGTH) {
    return [
      finding(
        "thin-description",
        "warn",
        tool.name,
        `description is only ${description.length} chars — likely too thin to disambiguate`,
      ),
    ];
  }
  return [];
}

function lintParameters(tool: DiscoveredTool): LintFinding[] {
  const schema = tool.inputSchema;
  const properties = asRecord(schema.properties);
  if (!properties) return [];

  const required = new Set(Array.isArray(schema.required) ? schema.required.map(String) : []);
  const findings: LintFinding[] = [];

  for (const [name, raw] of Object.entries(properties)) {
    const param = asRecord(raw) ?? {};
    const hasType =
      typeof param.type === "string" || Array.isArray(param.anyOf) || Array.isArray(param.oneOf);
    const description = typeof param.description === "string" ? param.description.trim() : "";

    if (!hasType) {
      findings.push(
        finding(
          "untyped-param",
          "warn",
          tool.name,
          `parameter "${name}" has no type — the model must guess its shape`,
        ),
      );
    }

    if (description === "") {
      // A required param with no description is the highest-signal gap: the model
      // is forced to call the tool and fill an argument it has no guidance on.
      // This is the exact friction observed on real servers (e.g. git's repo_path).
      if (required.has(name)) {
        findings.push(
          finding(
            "required-undescribed-param",
            "warn",
            tool.name,
            `required parameter "${name}" has no description — the model must supply it blind`,
          ),
        );
      } else {
        findings.push(
          finding("undescribed-param", "warn", tool.name, `parameter "${name}" has no description`),
        );
      }
    } else if (description.length < MIN_DESCRIPTION_LENGTH) {
      findings.push(
        finding(
          "thin-param-description",
          "warn",
          tool.name,
          `parameter "${name}" has a very short description ("${description}") — likely too thin to disambiguate`,
        ),
      );
    }
  }

  return findings;
}

function lintCollisions(tools: DiscoveredTool[]): LintFinding[] {
  const byDescription = new Map<string, string[]>();
  for (const tool of tools) {
    const key = tool.description?.trim().toLowerCase();
    if (!key) continue;
    const group = byDescription.get(key) ?? [];
    group.push(tool.name);
    byDescription.set(key, group);
  }

  const findings: LintFinding[] = [];
  for (const names of byDescription.values()) {
    if (names.length > 1) {
      for (const name of names) {
        const others = names.filter((n) => n !== name).join(", ");
        findings.push(
          finding(
            "duplicate-description",
            "warn",
            name,
            `shares an identical description with ${others} — the model cannot tell them apart`,
          ),
        );
      }
    }
  }
  return findings;
}

function finding(rule: string, severity: LintSeverity, tool: string, message: string): LintFinding {
  return { rule, severity, tool, message };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
