import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall } from "../api-client.js";
import { addLoyaltyContactInput } from "../schemas.js";
import { SmsmasivosError } from "../errors.js";

export function registerAddLoyaltyContact(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "add_loyalty_contact",
    "Agrega un contacto a una tarjeta de lealtad. Requiere loyalty_key y número de teléfono del cliente.",
    addLoyaltyContactInput.shape,
    async (params) => {
      try {
        await apiCall("/loyalty/contact/add", params);
        return {
          content: [
            {
              type: "text" as const,
              text: `✓ Contacto ${params.customer_name ?? params.phone} agregado a la tarjeta de lealtad.`,
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
