import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall } from "../api-client.js";
import { findAgendaInput } from "../schemas.js";
import { SmsmasivosError } from "../errors.js";

interface FindAgendaResponse {
  result: Array<{ id: string; name: string }>;
  total_count?: number;
  page?: number;
  total_pages?: number;
  limit?: number;
  has_more?: boolean;
  next_page?: number | null;
}

export function registerFindAgenda(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "find_agenda",
    "Busca agendas por nombre (búsqueda parcial, case-insensitive). Paginado por número de página: default page=1, limit=20 (max 100). Si la respuesta dice has_more=true, vuelve a invocar con el next_page indicado.",
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

        const showing = result.result.length;
        const total = result.total_count ?? showing;
        const page = result.page ?? 1;
        const totalPages = result.total_pages ?? 1;
        const hasMore = result.has_more ?? false;
        const nextPage = result.next_page ?? null;

        const headerParts = [`Mostrando ${showing}`];
        if (total > showing || totalPages > 1) {
          headerParts.push(`de ${total}`);
          headerParts.push(`(página ${page} de ${totalPages})`);
        }
        const lines = [`${headerParts.join(" ")}:\n`];
        for (const a of result.result) {
          lines.push(`- ${a.name} (list_key: ${a.id})`);
        }
        if (hasMore && nextPage) {
          const remaining = total - page * (result.limit ?? showing);
          lines.push(
            `\nHay ${Math.max(remaining, 0)} agenda(s) más. Para la siguiente página invoca con page=${nextPage}.`,
          );
        }
        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      } catch (error) {
        if (error instanceof SmsmasivosError) {
          // contactlist_06: página fuera de rango. No es error técnico, es input
          // recuperable — mensaje natural sin prefix "Error:" para que el LLM
          // entienda que debe ajustar el `page` en lugar de reportar fallo.
          if (error.code === "contactlist_06") {
            return {
              content: [{ type: "text" as const, text: error.message }],
            };
          }
          return {
            content: [{ type: "text" as const, text: `Error: ${error.message}` }],
            isError: true,
          };
        }
        return {
          content: [{ type: "text" as const, text: `Error: ${String(error)}` }],
          isError: true,
        };
      }
    },
  );
}
