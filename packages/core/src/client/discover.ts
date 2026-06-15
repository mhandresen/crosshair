import type { Client } from "@modelcontextprotocol/sdk/client/index.js";

export interface DiscoveredTool {
  name: string;
  description?: string;
  // JSON Schema as the server advertises it. Validated in schema-lint (Phase 2).
  inputSchema: Record<string, unknown>;
}

export async function discover(client: Client): Promise<DiscoveredTool[]> {
  const tools: DiscoveredTool[] = [];
  let cursor: string | undefined;

  // Tool lists paginate. Our target is *complex multi-tool* servers, so the
  // common case is exactly the one a single listTools() call gets wrong.
  do {
    const page = await client.listTools(cursor ? { cursor } : {});
    for (const tool of page.tools) {
      tools.push({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema as Record<string, unknown>,
      });
    }
    cursor = page.nextCursor;
  } while (cursor);

  return tools;
}
