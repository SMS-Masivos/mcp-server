import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall } from "../api-client.js";
import { registerLoyaltySaleInput } from "../schemas.js";
import { SmsmasivosError } from "../errors.js";

export function registerRegisterLoyaltySale(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "register_loyalty_sale",
    "Registra una venta en el programa de lealtad, agregando sellos al contacto. Requiere loyalty_key, teléfono del cliente y cantidad de sellos.",
    registerLoyaltySaleInput.shape,
    async (params) => {
      try {
        await apiCall("/loyalty/sale", params);
        return {
          content: [
            {
              type: "text" as const,
              text: `✓ ${params.stamps_quantity} sello(s) registrado(s) para ${params.phone}.`,
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
