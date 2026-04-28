import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall } from "../api-client.js";
import { deleteAgendaInput } from "../schemas.js";
import { SmsmasivosError } from "../errors.js";

export function registerDeleteAgenda(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "delete_agenda",
    "Elimina una agenda y TODOS sus contactos de forma permanente. OPERACIÓN DESTRUCTIVA E IRREVERSIBLE — pide confirmación explícita al humano antes de invocar. Si la agenda está vinculada a tarjetas de lealtad o monederos, el API la rechaza.",
    deleteAgendaInput.shape,
    async (params) => {
      try {
        await apiCall("/agendas/delete", params);
        return {
          content: [
            { type: "text" as const, text: `✓ Agenda eliminada (list_key: ${params.list_key}).` },
          ],
        };
      } catch (error) {
        let message = error instanceof SmsmasivosError ? error.message : String(error);
        if (/vinculada|linked|tool/i.test(message)) {
          message +=
            ". Esta agenda está asociada a una tarjeta de lealtad, monedero u otra herramienta. Desvincula la herramienta antes de eliminar la agenda.";
        }
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
