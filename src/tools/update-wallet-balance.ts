import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall } from "../api-client.js";
import { updateWalletBalanceInput } from "../schemas.js";
import { SmsmasivosError } from "../errors.js";

export function registerUpdateWalletBalance(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "update_wallet_balance",
    "Agrega o resta saldo en el monedero de un contacto. transaction_type '1' = agregar, '2' = restar. Requiere wallet_key, teléfono, monto y usertool_id.",
    updateWalletBalanceInput.shape,
    async (params) => {
      try {
        await apiCall("/wallet/balance/update", params);
        const action = params.transaction_type === "1" ? "agregados" : "restados";
        return {
          content: [
            {
              type: "text" as const,
              text: `✓ $${params.transaction_amount} ${action} al monedero de ${params.phone}.`,
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
