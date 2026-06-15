import { connect, discover, formatLint, lintTools } from "@crosshair/core";

export interface LintOptions {
  serverCommand: string;
  serverArgs?: string[];
  strict?: boolean;
}

export async function lintCommand(options: LintOptions): Promise<void> {
  const connection = await connect({ command: options.serverCommand, args: options.serverArgs });
  try {
    const tools = await discover(connection.client);
    const findings = lintTools(tools);
    const output = formatLint(findings);

    if (output) {
      console.log(output);
    } else {
      console.log(`\nNo issues found across ${tools.length} tool${tools.length === 1 ? "" : "s"}.\n`);
    }

    // Warnings only fail the run under --strict, mirroring `run`'s contract.
    process.exitCode = options.strict && findings.length > 0 ? 1 : 0;
  } finally {
    await connection.close();
  }
}