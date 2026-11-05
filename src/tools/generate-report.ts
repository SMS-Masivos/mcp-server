import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall } from "../api-client.js";
import { generateReportInput, dateRangeMaxSeven } from "../schemas.js";
import { SmsmasivosError } from "../errors.js";

const REPORT_TIMEOUT_MS = 300_000; // 5 min — el endpoint es síncrono y puede tardar

interface ReportRow {
  name: string;
  created_date: string;
  reference: string;
  number: string;
  message: string;
  sent_date: string;
  status: string;
  operator: string;
  type: string;
}

interface GenerateReportResponse {
  report: ReportRow[];
  pagination?: { has_more?: boolean; next_cursor?: string | null };
}

export function registerGenerateReport(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "generate_report",
    "Genera un reporte detallado de mensajes enviados en un rango de fechas (MÁXIMO 7 DÍAS). Devuelve cada mensaje individual con destinatario, status, operador y referencia. Para agregados rápidos por campaña usa get_report_details. La operación puede tardar hasta 5 minutos en cuentas con alto volumen. El reporte llega en páginas de unos 10,000 mensajes y aquí se muestran hasta 50 por página; el detalle completo se descarga desde el panel. Si la respuesta dice que está incompleto, pide la página siguiente solo si el usuario la necesita, con las mismas fechas, el mismo sandbox y el cursor indicado. Cada página cuenta como una de las 10 consultas de reporte que la cuenta tiene al día, compartidas con sus otras integraciones.",
    generateReportInput.shape,
    async (params) => {
      try {
        // Cap server-side de rango: el refine no se incluye en el JSON Schema del SDK,
        // así que validamos manualmente aquí para dar mensaje claro al LLM.
        if (!dateRangeMaxSeven(params.start_date, params.end_date)) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Error: El rango máximo permitido es 7 días. Para rangos mayores usa el panel web o invoca esta tool en chunks de 7 días.",
              },
            ],
            isError: true,
          };
        }

        const result = await apiCall<GenerateReportResponse>(
          "/reports/generate",
          params,
          { timeout: REPORT_TIMEOUT_MS },
        );

        const rows = result.report ?? [];
        const hasMore = result.pagination?.has_more === true;
        const nextCursor = result.pagination?.next_cursor;
        const rango = `entre ${params.start_date} y ${params.end_date}`;
        const siguiente = nextCursor
          ? `\nPara el detalle completo descarga el reporte desde el panel. Pide la página siguiente solo si el usuario la necesita: invoca con start_date="${params.start_date}", end_date="${params.end_date}", sandbox="${params.sandbox ?? "0"}" y cursor="${nextCursor}". Cada página gasta una de las 10 consultas de reporte que la cuenta tiene al día, compartidas con sus otras integraciones, y aquí solo se muestran 50 mensajes por página.`
          : `\nLa API no indicó cómo pedir la página siguiente: descarga el reporte completo desde el panel.`;

        if (rows.length === 0) {
          // La API descarta filas después de paginar: una página vacía con has_more no es el final.
          const text = hasMore
            ? `Reporte INCOMPLETO: esta página no trajo mensajes ${rango}, pero la API indica que hay más.\n${siguiente}`
            : params.cursor
              ? `No hay más mensajes ${rango} después de ese cursor.`
              : `No hay mensajes registrados ${rango}.`;
          return { content: [{ type: "text" as const, text }] };
        }

        const lines = [
          hasMore
            ? `Reporte INCOMPLETO: esta página trae ${rows.length} mensaje(s) ${rango}${params.cursor ? " después de ese cursor" : ""}, y hay más.\n`
            : params.cursor
              ? `Última página: ${rows.length} mensaje(s) ${rango} después de ese cursor.\n`
              : `${rows.length} mensaje(s) ${rango}:\n`,
        ];
        for (const r of rows.slice(0, 50)) {
          lines.push(
            `- [${r.status}] ${r.number} ← ${r.name} | ${r.sent_date} | ref:${r.reference}`,
          );
        }
        if (rows.length > 50) {
          lines.push(
            hasMore
              ? `\n... y ${rows.length - 50} más en esta página.`
              : `\n... y ${rows.length - 50} más. Para detalle completo descarga desde el panel.`,
          );
        }
        if (hasMore) lines.push(siguiente);
        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      } catch (error) {
        let message = error instanceof SmsmasivosError ? error.message : String(error);
        if (/only_10|too_many|límite|limit/i.test(message)) {
          message +=
            ". Has alcanzado el límite de reportes API. Espera o descarga desde el panel web.";
        }
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
