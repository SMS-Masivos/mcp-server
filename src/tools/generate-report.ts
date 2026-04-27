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
}

export function registerGenerateReport(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "generate_report",
    "Genera un reporte detallado de mensajes enviados en un rango de fechas (MÁXIMO 7 DÍAS). Devuelve cada mensaje individual con destinatario, status, operador y referencia. Para agregados rápidos por campaña usa get_report_details. La operación puede tardar hasta 5 minutos en cuentas con alto volumen. El API tiene límite de 4 reportes por usuario antes de bloquear.",
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
        if (rows.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No hay mensajes registrados entre ${params.start_date} y ${params.end_date}.`,
              },
            ],
          };
        }

        const lines = [
          `${rows.length} mensaje(s) entre ${params.start_date} y ${params.end_date}:\n`,
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
