import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall } from "../api-client.js";
import { listAgendasInput } from "../schemas.js";
import { SmsmasivosError } from "../errors.js";

interface Agenda {
  agenda_name: string;
  agenda_description: string;
  agenda_creation_date: string;
  list_key: string;
}

interface ListAgendasResponse {
  result: Agenda[];
}

export function registerListAgendas(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "list_agendas",
    "Lista todas las agendas (listas de contactos) de tu cuenta en SMS Masivos. Cada agenda tiene un list_key único que necesitas para obtener contactos o agregar nuevos.",
    listAgendasInput.shape,
    async () => {
      try {
        const result = await apiCall<ListAgendasResponse>("/agendas/get");
        const agendas = result.result ?? [];

        if (agendas.length === 0) {
          return { content: [{ type: "text" as const, text: "No tienes agendas creadas." }] };
        }

        const lines = agendas.map(
          (a) => `- ${a.agenda_name} (${a.agenda_description || "sin descripción"}) — key: ${a.list_key}`,
        );
        return {
          content: [{ type: "text" as const, text: `${agendas.length} agenda(s):\n${lines.join("\n")}` }],
        };
      } catch (error) {
        const message = error instanceof SmsmasivosError ? error.message : String(error);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
