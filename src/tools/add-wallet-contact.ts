import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall } from "../api-client.js";
import { addWalletContactInput } from "../schemas.js";
import { SmsmasivosError } from "../errors.js";

export function registerAddWalletContact(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "add_wallet_contact",
    "Agrega un contacto a un monedero electrónico. Requiere wallet_key, teléfono, nombre del cliente y usertool_id (obtenlo de list_wallets).",
    addWalletContactInput.shape,
    async (params) => {
      try {
        await apiCall("/wallet/contact/add", params);
        return {
          content: [
            {
              type: "text" as const,
              text: `✓ Contacto ${params.customer_name} (${params.phone}) agregado al monedero.`,
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
