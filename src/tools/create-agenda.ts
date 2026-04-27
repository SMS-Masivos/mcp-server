import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall } from "../api-client.js";
import { createAgendaInput } from "../schemas.js";
import { SmsmasivosError } from "../errors.js";

interface CreateAgendaResponse {
  list_key: string;
}

export function registerCreateAgenda(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "create_agenda",
    "Crea una nueva agenda (lista de contactos) en SMS Masivos. Devuelve el list_key que necesitas para agregar contactos con add_contact.",
    createAgendaInput.shape,
    async (params) => {
      try {
        const result = await apiCall<CreateAgendaResponse>("/agendas/add", params);
        return {
          content: [
            {
              type: "text" as const,
              text: `✓ Agenda "${params.agenda_name}" creada. list_key: ${result.list_key}`,
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
