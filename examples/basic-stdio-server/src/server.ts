import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "shop-support", version: "0.0.0" });

server.registerTool(
  "search_products",
  {
    description: "Search the product catalog by free-text query.",
    inputSchema: { query: z.string().describe("What the customer is looking for") },
  },
  async ({ query }) => ({
    content: [{ type: "text", text: `Results for "${query}": Widget Pro, Widget Mini` }],
  }),
);

server.registerTool(
  "get_order_status",
  {
    description: "Look up the current status of an existing order by its ID.",
    inputSchema: { order_id: z.string().describe("The order identifier, e.g. ORD-1234") },
  },
  async ({ order_id }) => ({
    content: [{ type: "text", text: `Order ${order_id} is: shipped` }],
  }),
);

server.registerTool(
  "cancel_order",
  {
    description: "Permanently cancel an order. This cannot be undone.",
    inputSchema: { order_id: z.string().describe("The order identifier to cancel") },
    annotations: { destructiveHint: true },
  },
  async ({ order_id }) => ({
    content: [{ type: "text", text: `Order ${order_id} has been cancelled.` }],
  }),
);

const transport = new StdioServerTransport();
await server.connect(transport);