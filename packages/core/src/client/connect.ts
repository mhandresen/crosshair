import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  getDefaultEnvironment,
  StdioClientTransport,
} from "@modelcontextprotocol/sdk/client/stdio.js";

export interface ServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}

export interface ConnectedClient {
  client: Client;
  close: () => Promise<void>;
}

export async function connect(config: ServerConfig): Promise<ConnectedClient> {
  const transport = new StdioClientTransport({
    command: config.command,
    args: config.args,
    cwd: config.cwd,
    // The SDK strips the parent env by default for safety. Merge onto its safe
    // baseline (which carries PATH) so a caller's vars extend rather than replace it.
    env: config.env ? { ...getDefaultEnvironment(), ...config.env } : getDefaultEnvironment(),
    // Pipe the child's stderr through; a server that crashes on boot should be
    // visible, not surface as an opaque connection timeout.
    stderr: "inherit",
  });

  const client = new Client({ name: "crosshair", version: "0.0.0" });

  try {
    await client.connect(transport);
  } catch (error) {
    await transport.close().catch(() => {});
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`crosshair: failed to launch MCP server "${config.command}": ${reason}`);
  }

  return { client, close: () => client.close() };
}
