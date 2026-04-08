import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall } from "../api-client.js";
import { getLoyaltyContactInput } from "../schemas.js";
import { SmsmasivosError } from "../errors.js";

interface LoyaltyContactResponse {
  contacts?: Array<{
    phone: string;
    name?: string;
    stamps?: number;
    total_stamps?: number;
    redeems?: number;
  }>;
}

export function registerGetLoyaltyContact(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "get_loyalty_contact",
    "Consulta los datos de un contacto en una tarjeta de lealtad: sellos acumulados, canjes, etc. Si omites el teléfono, retorna todos los contactos.",
    getLoyaltyContactInput.shape,
    async (params) => {
      try {
        const result = await apiCall<LoyaltyContactResponse>("/loyalty/contact/get", params);
        const contacts = result.contacts ?? [];
        if (contacts.length === 0) {
          return { content: [{ type: "text" as const, text: "No se encontraron contactos." }] };
        }
        const lines = [`${contacts.length} contacto(s):`];
        for (const c of contacts) {
          lines.push(
            `- ${c.name ?? c.phone}: ${c.stamps ?? 0} sellos, ${c.redeems ?? 0} canjes`,
          );
        }
        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      } catch (error) {
        const message = error instanceof SmsmasivosError ? error.message : String(error);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
