import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall } from "../api-client.js";
import { getReportDetailsInput } from "../schemas.js";
import { SmsmasivosError } from "../errors.js";

interface ReportDetails {
  effectiveness: number;
  totals: number;
  delivered: number;
  failed: number;
  pending: number;
  not_charged: number;
}

interface GetReportDetailsResponse {
  details: ReportDetails;
}

export function registerGetReportDetails(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "get_report_details",
    "Devuelve agregados rápidos por campaña: total enviados, entregados, fallidos, pendientes, no cobrados y % de efectividad. Mucho más rápido que generate_report cuando solo necesitas KPIs. Requiere campaign_id (obténlo de list_campaigns o send_sms).",
    getReportDetailsInput.shape,
    async (params) => {
      try {
        const result = await apiCall<GetReportDetailsResponse>("/reports/details", params);
        const d = result.details;
        const lines = [
          `Reporte de campaña ${params.campaign_id}:`,
          `  Total: ${d.totals}`,
          `  Entregados: ${d.delivered}`,
          `  Fallidos: ${d.failed}`,
          `  Pendientes: ${d.pending}`,
          `  No cobrados: ${d.not_charged}`,
          `  Efectividad: ${d.effectiveness}%`,
        ];
        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      } catch (error) {
        let message = error instanceof SmsmasivosError ? error.message : String(error);
        if (/processing|en proceso/i.test(message)) {
          message +=
            ". La campaña aún se está procesando. Espera unos minutos y vuelve a consultar.";
        }
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
