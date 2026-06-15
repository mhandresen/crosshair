import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AnthropicAdapter, type ConnectedClient, connect, discover } from "../src";

const here = dirname(fileURLToPath(import.meta.url));
const serverEntry = resolve(here, "../../../examples/basic-stdio-server/dist/server.js");

// Opt in with CROSSHAIR_LIVE=1 (and ANTHROPIC_API_KEY set). Otherwise skipped,
// so CI and routine local runs stay free and offline.
describe.skipIf(!process.env.CROSSHAIR_LIVE)("AnthropicAdapter (live)", () => {
  let connection: ConnectedClient | undefined;

  beforeAll(async () => {
    if (!existsSync(serverEntry)) {
      throw new Error("Example server not built — run `pnpm build` first.");
    }
    connection = await connect({ command: process.execPath, args: [serverEntry] });
  });

  afterAll(async () => {
    await connection?.close();
  });

  it("picks the order-status tool for an order-status prompt", async () => {
    if (!connection) throw new Error("connection not established");
    const tools = await discover(connection.client);
    const adapter = new AnthropicAdapter();

    const result = await adapter.complete({
      temperature: 0,
      messages: [{ role: "user", content: "Can you check the status of my order ORD-9001?" }],
      tools,
    });

    expect(result.toolCalls.map((c) => c.name)).toContain("get_order_status");
  }, 30_000);
});
