import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall } from "../api-client.js";
import { getWalletContactInput } from "../schemas.js";
import { SmsmasivosError } from "../errors.js";

interface WalletContactResponse {
  contacts?: Array<{
    phone: string;
    name?: string;
    balance?: number;
  }>;
}

export function registerGetWalletContact(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "get_wallet_contact",
    "Consulta el saldo de un contacto en un monedero electrónico. Si omites el teléfono, retorna todos los contactos con sus saldos.",
    getWalletContactInput.shape,
    async (params) => {
      try {
        const result = await apiCall<WalletContactResponse>("/wallet/contact/get", params);
        const contacts = result.contacts ?? [];
        if (contacts.length === 0) {
          return { content: [{ type: "text" as const, text: "No se encontraron contactos." }] };
        }
        const lines = [`${contacts.length} contacto(s):`];
        for (const c of contacts) {
          lines.push(`- ${c.name ?? c.phone}: $${c.balance ?? 0} de saldo`);
        }
        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      } catch (error) {
        const message = error instanceof SmsmasivosError ? error.message : String(error);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
