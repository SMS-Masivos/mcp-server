import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall } from "../api-client.js";
import { getContactsInput } from "../schemas.js";
import { SmsmasivosError } from "../errors.js";

interface Contact {
  contact_name: string;
  contact_number: string;
  contact_email: string;
  contact_creation_date: string;
}

interface GetContactsResponse {
  result: Contact[];
}

export function registerGetContacts(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "get_contacts",
    "Obtiene todos los contactos de una agenda específica usando su list_key. Usa list_agendas primero para obtener el list_key.",
    getContactsInput.shape,
    async (params) => {
      try {
        const result = await apiCall<GetContactsResponse>("/agendas/get_contacts", params);
        const contacts = result.result ?? [];

        if (contacts.length === 0) {
          return { content: [{ type: "text" as const, text: "Esta agenda no tiene contactos." }] };
        }

        const lines = contacts.map(
          (c) => `- ${c.contact_name || "(sin nombre)"}: ${c.contact_number} ${c.contact_email ? `(${c.contact_email})` : ""}`,
        );
        return {
          content: [{ type: "text" as const, text: `${contacts.length} contacto(s):\n${lines.join("\n")}` }],
        };
      } catch (error) {
        const message = error instanceof SmsmasivosError ? error.message : String(error);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
