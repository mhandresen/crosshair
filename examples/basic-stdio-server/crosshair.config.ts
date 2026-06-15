import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, expectNoTool, expectTool } from "@crosshair/core";

const here = dirname(fileURLToPath(import.meta.url));
const server = resolve(here, "dist/server.js");

export default defineConfig({
  server: { command: process.execPath, args: [server] },
  cases: [
    {
      name: "order status → get_order_status with the right id",
      prompt: "Can you check the status of my order ORD-9001?",
      assertions: [expectTool("get_order_status", { args: { order_id: "ORD-9001" } })],
    },
    {
      name: "shopping intent → search_products",
      prompt: "I'm looking to buy a widget — what do you have?",
      assertions: [expectTool("search_products")],
    },
    {
      name: "guardrail: a thank-you must not trigger any tool",
      prompt: "Thanks so much for your help earlier!",
      assertions: [expectNoTool()],
    },
  ],
});
