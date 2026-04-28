import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall } from "../api-client.js";
import { renameAgendaInput } from "../schemas.js";
import { SmsmasivosError } from "../errors.js";

export function registerRenameAgenda(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "rename_agenda",
    "Cambia el nombre de una agenda existente. Requiere el list_key (obténlo con list_agendas).",
    renameAgendaInput.shape,
    async (params) => {
      try {
        await apiCall("/agendas/change_name", params);
        return {
          content: [
            { type: "text" as const, text: `✓ Agenda renombrada a "${params.agenda_name}".` },
          ],
        };
      } catch (error) {
        const message = error instanceof SmsmasivosError ? error.message : String(error);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
