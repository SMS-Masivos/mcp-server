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
    "Genera un reporte detallado de mensajes enviados en un rango de fechas (MÁXIMO 7 DÍAS). Devuelve cada mensaje individual con destinatario, status, operador y referencia. Para agregados rápidos por campaña usa get_report_details. La operación puede tardar hasta 5 minutos en cuentas con alto volumen. El reporte llega en páginas de unos 10,000 mensajes: si la respuesta dice que está incompleto, vuelve a invocar con las mismas fechas y el cursor indicado. Cada página cuenta como una de las 10 consultas de reporte que la cuenta tiene al día.",
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
        if (rows.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: params.cursor
                  ? `No hay más mensajes entre ${params.start_date} y ${params.end_date} después de ese cursor.`
                  : `No hay mensajes registrados entre ${params.start_date} y ${params.end_date}.`,
              },
            ],
          };
        }

        const lines = [
          hasMore
            ? `Reporte INCOMPLETO: esta página trae ${rows.length} mensaje(s) entre ${params.start_date} y ${params.end_date}, y hay más.\n`
            : `${rows.length} mensaje(s) entre ${params.start_date} y ${params.end_date}:\n`,
        ];
        for (const r of rows.slice(0, 50)) {
          lines.push(
            `- [${r.status}] ${r.number} ← ${r.name} | ${r.sent_date} | ref:${r.reference}`,
          );
        }
        if (rows.length > 50) {
          lines.push(
            `\n... y ${rows.length - 50} más. Para detalle completo descarga desde el panel.`,
          );
        }
        if (hasMore) {
          lines.push(
            nextCursor
              ? `\nPara la página siguiente invoca con las mismas fechas y cursor="${nextCursor}". Cada página cuenta como una de las 10 consultas de reporte del día.`
              : `\nLa API no indicó cómo pedir la página siguiente: descarga el reporte completo desde el panel.`,
          );
        }
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
