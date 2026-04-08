import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall } from "../api-client.js";
import { getCampaignStatsInput } from "../schemas.js";
import { SmsmasivosError } from "../errors.js";

interface CampaignStatsResponse {
  details: {
    effectiveness: number;
    totals: number;
    delivered: number;
    failed: number;
    pending: number;
    not_charged: number;
  };
}

export function registerGetCampaignStats(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "get_campaign_stats",
    "Obtiene las estadísticas de entrega de una campaña SMS por su ID. Muestra: efectividad (%), entregados, fallidos, pendientes y no cobrados. Funciona para campañas enviadas o completadas. Detecta automáticamente si la campaña es sandbox.",
    getCampaignStatsInput.shape,
    async (params) => {
      try {
        const result = await apiCall<CampaignStatsResponse>("/reports/details", params);
        const d = result.details;
        const lines = [
          `Estadísticas de campaña ${params.campaign_id}:`,
          `  Efectividad: ${d.effectiveness}%`,
          `  Total mensajes: ${d.totals}`,
          `  Entregados: ${d.delivered}`,
          `  Fallidos: ${d.failed}`,
          `  Pendientes: ${d.pending}`,
          `  No cobrados: ${d.not_charged}`,
        ];
        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      } catch (error) {
        const message = error instanceof SmsmasivosError ? error.message : String(error);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
