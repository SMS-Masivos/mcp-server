import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerFaqResources } from "./faq.js";

export function registerAllResources(server: McpServer) {
  registerFaqResources(server);
}
