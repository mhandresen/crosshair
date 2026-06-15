import {
  AnthropicAdapter,
  type CaseResult,
  connect,
  defineCase,
  discover,
  expectTool,
  runCase,
} from "@crosshair/core";
import pc from "picocolors";

// Hardcoded for now; config-loaded cases arrive in Phase 2.
const exampleCase = defineCase({
  name: "order status → get_order_status",
  prompt: "Can you check the status of my order ORD-9001?",
  assertions: [expectTool("get_order_status")],
});

export async function runCommand(command: string, args: string[]): Promise<void> {
  const connection = await connect({ command, args });
  try {
    const tools = await discover(connection.client);
    const result = await runCase(new AnthropicAdapter(), tools, exampleCase);
    printResult(result);
    // Drive the exit code from the verdict — this is the seed of the CI wedge.
    process.exitCode = result.passed ? 0 : 1;
  } finally {
    await connection.close();
  }
}

function printResult(result: CaseResult): void {
  console.log(`${result.passed ? pc.green("PASS") : pc.red("FAIL")}  ${result.name}`);
  for (const assertion of result.assertions) {
    console.log(`  ${assertion.passed ? pc.green("✓") : pc.red("✗")} ${assertion.message}`);
  }
}