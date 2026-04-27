import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall } from "../api-client.js";
import { duplicateContactInput } from "../schemas.js";
import { SmsmasivosError } from "../errors.js";

interface DuplicateContactResponse {
  callback?: { id: number; name?: string; number?: string };
}

export function registerDuplicateContact(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "duplicate_contact",
    "Copia un contacto de una agenda a otra. El contacto debe existir en current_list_key y NO existir todavía en new_list_key. Útil para mover prospectos calificados entre listas sin re-tipear datos.",
    duplicateContactInput.shape,
    async (params) => {
      try {
        const result = await apiCall<DuplicateContactResponse>("/contacts/duplicate", params);
        const c = result.callback;
        const desc = c ? `${c.name || "(sin nombre)"} — ${c.number || ""}` : `ID ${params.contact_id}`;
        return {
          content: [
            {
              type: "text" as const,
              text: `✓ Contacto duplicado: ${desc} (de ${params.current_list_key} → ${params.new_list_key})`,
            },
          ],
        };
      } catch (error) {
        let message = error instanceof SmsmasivosError ? error.message : String(error);
        if (/already|ya existe|duplicate/i.test(message)) {
          message +=
            ". El contacto ya existe en la agenda destino. Si querés actualizar sus datos usa update_contact.";
        }
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
