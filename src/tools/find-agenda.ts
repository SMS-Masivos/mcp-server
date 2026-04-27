import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall } from "../api-client.js";
import { findAgendaInput } from "../schemas.js";
import { SmsmasivosError } from "../errors.js";

interface FindAgendaResponse {
  result: Array<{ id: string; name: string }>;
}

export function registerFindAgenda(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "find_agenda",
    "Busca agendas por nombre (búsqueda parcial, case-insensitive). Útil cuando el usuario menciona el nombre pero no recuerda el list_key. Para listar TODAS las agendas usa list_agendas.",
    findAgendaInput.shape,
    async (params) => {
      try {
        const result = await apiCall<FindAgendaResponse>(
          "/contactlist/find",
          params,
          { method: "GET" },
        );

        if (!result.result || result.result.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No se encontraron agendas que contengan "${params.query}".`,
              },
            ],
          };
        }

        const lines = [`${result.result.length} agenda(s) encontrada(s):\n`];
        for (const a of result.result) {
          lines.push(`- ${a.name} (list_key: ${a.id})`);
        }
        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      } catch (error) {
        const message = error instanceof SmsmasivosError ? error.message : String(error);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
