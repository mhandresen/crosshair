import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { connect, discover } from "@crosshair/core";
import * as p from "@clack/prompts";

export async function initCommand(): Promise<void> {
  p.intro("crosshair init");

  const configPath = resolve(process.cwd(), "crosshair.config.ts");
  if (existsSync(configPath)) {
    const overwrite = await p.confirm({
      message: "crosshair.config.ts already exists. Overwrite it?",
      initialValue: false,
    });
    if (p.isCancel(overwrite) || !overwrite) {
      p.cancel("Left your existing config untouched.");
      return;
    }
  }

  const command = await p.text({
    message: "How does your MCP server start? (the command)",
    placeholder: "node",
    validate: (v) => (v.trim() ? undefined : "A command is required."),
  });
  if (p.isCancel(command)) return p.cancel("Cancelled.");

  const argsRaw = await p.text({
    message: "Arguments, space-separated (optional)",
    placeholder: "dist/server.js",
  });
  if (p.isCancel(argsRaw)) return p.cancel("Cancelled.");
  const args = String(argsRaw).trim().split(/\s+/).filter(Boolean);

  // Try to connect and read real tool names, so the example case is seeded with
  // one of *their* tools. Best-effort: a server that won't start shouldn't block
  // scaffolding — fall back to a placeholder and let them fill it in.
  let exampleTool = "your_tool_name";
  const spin = p.spinner();
  spin.start("Connecting to discover your tools…");
  try {
    const connection = await connect({ command: String(command), args });
    try {
      const tools = await discover(connection.client);
      if (tools[0]) exampleTool = tools[0].name;
      spin.stop(`Found ${tools.length} tool${tools.length === 1 ? "" : "s"}.`);
    } finally {
      await connection.close();
    }
  } catch {
    spin.stop("Couldn't connect — scaffolding with a placeholder you can edit.");
  }

  writeFileSync(configPath, renderConfig(String(command), args, exampleTool));
  p.outro(`Wrote crosshair.config.ts. Next:  crosshair lint  ·  crosshair run`);
}

function renderConfig(command: string, args: string[], tool: string): string {
  const argsLiteral = JSON.stringify(args);
  return `import { defineConfig, expectTool } from "@crosshair/core";

export default defineConfig({
  server: { command: ${JSON.stringify(command)}, args: ${argsLiteral} },
  cases: [
    {
      name: "TODO: describe what the user is asking for",
      prompt: "TODO: a realistic thing a user would say",
      assertions: [expectTool(${JSON.stringify(tool)})],
    },
  ],
});
`;
}