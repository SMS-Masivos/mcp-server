import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall } from "../api-client.js";
import { updateContactInput } from "../schemas.js";
import { SmsmasivosError } from "../errors.js";

interface UpdateContactResponse {
  callback?: { id: number; name?: string; number?: string; email?: string };
}

export function registerUpdateContact(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "update_contact",
    "Actualiza los datos de un contacto existente en una agenda. Identifica al contacto por list_key + number. Si el contacto no existe en esa agenda, sugiere usar add_contact en su lugar.",
    updateContactInput.shape,
    async (params) => {
      try {
        // El API espera `email` como nuevo valor en update; renombramos new_email→email
        // si vino, y dejamos email original como identificador (no soportado por API actual,
        // se usa solo como hint client-side). Pasamos new_email en su lugar.
        const apiParams: Record<string, unknown> = { ...params };
        if (params.new_email !== undefined) {
          apiParams.email = params.new_email;
          delete apiParams.new_email;
        }
        const result = await apiCall<UpdateContactResponse>("/contacts/update", apiParams);
        const c = result.callback;
        const desc = c
          ? `${c.name || "(sin nombre)"} — ${c.number || params.number}`
          : params.number;
        return {
          content: [{ type: "text" as const, text: `✓ Contacto actualizado: ${desc}` }],
        };
      } catch (error) {
        let message = error instanceof SmsmasivosError ? error.message : String(error);
        if (/not.exist|no existe|not_found/i.test(message)) {
          message += ". El contacto no existe en esta agenda. Usa add_contact para crearlo.";
        }
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
