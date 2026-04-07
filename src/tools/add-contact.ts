import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall } from "../api-client.js";
import { addContactInput } from "../schemas.js";
import { SmsmasivosError } from "../errors.js";

interface AddContactResponse {
  callback: {
    id: number;
    name: string;
    number: string;
    email: string;
  };
}

export function registerAddContact(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "add_contact",
    "Agrega un nuevo contacto a una agenda existente en SMS Masivos. Requiere el list_key de la agenda y el número de teléfono. Si el número ya existe en la agenda, se actualiza.",
    addContactInput.shape,
    async (params) => {
      try {
        const result = await apiCall<AddContactResponse>("/contacts/add", params);
        const c = result.callback;
        return {
          content: [
            {
              type: "text" as const,
              text: `✓ Contacto agregado: ${c.name || "(sin nombre)"} — ${c.number} (ID: ${c.id})`,
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
