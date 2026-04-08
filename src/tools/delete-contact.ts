import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall } from "../api-client.js";
import { deleteContactInput } from "../schemas.js";
import { SmsmasivosError } from "../errors.js";

export function registerDeleteContact(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "delete_contact",
    "Elimina un contacto de una agenda. OPERACIÓN IRREVERSIBLE — el contacto se elimina permanentemente. Requiere list_key de la agenda y número de teléfono.",
    deleteContactInput.shape,
    async (params) => {
      try {
        await apiCall("/contacts/delete", params);
        return {
          content: [{ type: "text" as const, text: `✓ Contacto ${params.number} eliminado de la agenda.` }],
        };
      } catch (error) {
        const message = error instanceof SmsmasivosError ? error.message : String(error);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
