#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createApiClient } from "./api-client.js";
import { parseMaxCallsPerMinute } from "./rate-limiter.js";
import { registerAllTools } from "./tools/index.js";
import { registerAllResources } from "./resources/index.js";
import { registerAllPrompts } from "./prompts/index.js";

const apiKey = process.env.SMSMASIVOS_API_KEY;

if (!apiKey) {
  process.stderr.write(
    "Error: La variable de entorno SMSMASIVOS_API_KEY es requerida.\n" +
      "Configúrala con tu API key de SMS Masivos.\n",
  );
  process.exit(1);
}

const server = new McpServer(
  { name: "smsmasivos", version: "0.3.0" },
  {
    instructions:
      "Servidor MCP para SMS Masivos — plataforma de SMS masivos para México. " +
      "Usa check_balance antes de enviar SMS para verificar créditos disponibles. " +
      "Usa sandbox='1' en send_sms para pruebas sin envío real. " +
      "El código de país por defecto es 52 (México).",
  },
);

let maxCallsPerMinute: number | undefined;
try {
  maxCallsPerMinute = parseMaxCallsPerMinute(process.env.SMSMASIVOS_MAX_CALLS_PER_MINUTE);
} catch (error) {
  process.stderr.write(`Error: ${(error as Error).message}\n`);
  process.exit(1);
}

const apiCall = createApiClient({
  apiKey,
  baseUrl: process.env.SMSMASIVOS_BASE_URL,
  cfAccessClientId: process.env.CF_ACCESS_CLIENT_ID,
  cfAccessClientSecret: process.env.CF_ACCESS_CLIENT_SECRET,
  maxCallsPerMinute,
});
registerAllTools(server, apiCall);
registerAllResources(server);
registerAllPrompts(server);

const transport = new StdioServerTransport();
await server.connect(transport);
