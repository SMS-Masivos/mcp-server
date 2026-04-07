import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall } from "../api-client.js";
import { checkBalanceInput } from "../schemas.js";
import { SmsmasivosError } from "../errors.js";

interface BalanceResponse {
  credit: number;
}

export function registerCheckBalance(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "check_balance",
    "Consulta el saldo de créditos SMS disponibles en tu cuenta de SMS Masivos. Cada SMS consume 1 crédito. Usa esta herramienta para verificar saldo antes de enviar mensajes.",
    checkBalanceInput.shape,
    async () => {
      try {
        const result = await apiCall<BalanceResponse>("/credits/consult");
        return {
          content: [
            {
              type: "text" as const,
              text: `Créditos disponibles: ${result.credit}`,
            },
          ],
        };
      } catch (error) {
        const message = error instanceof SmsmasivosError ? error.message : String(error);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
