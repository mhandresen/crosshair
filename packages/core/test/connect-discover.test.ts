import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type ConnectedClient, connect, discover } from "../src";

const here = dirname(fileURLToPath(import.meta.url));
const serverEntry = resolve(here, "../../../examples/basic-stdio-server/dist/server.js");

describe("connect + discover", () => {
  let connection: ConnectedClient | undefined;

  beforeAll(async () => {
    if (!existsSync(serverEntry)) {
      throw new Error(
        `Example server not built — run \`pnpm build\` first (expected ${serverEntry}).`,
      );
    }
    connection = await connect({ command: process.execPath, args: [serverEntry] });
  });

  afterAll(async () => {
    await connection?.close();
  });

  it("discovers every tool the server exposes", async () => {
    if (!connection) throw new Error("connection not established");
    const names = (await discover(connection.client)).map((t) => t.name).sort();

    expect(names).toEqual(["cancel_order", "get_order_status", "search_products"]);
  });

  it("captures each tool's description and input schema", async () => {
    if (!connection) throw new Error("connection not established");
    const tools = await discover(connection.client);
    const search = tools.find((t) => t.name === "search_products");

    expect(search?.description).toContain("Search the product catalog");
    expect(search?.inputSchema).toMatchObject({ type: "object" });
  });
});
