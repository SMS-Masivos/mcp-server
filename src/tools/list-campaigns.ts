import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall } from "../api-client.js";
import { listCampaignsInput } from "../schemas.js";
import { SmsmasivosError } from "../errors.js";

interface Campaign {
  id: number;
  name: string;
  create_date: string;
  type: string;
  status: string;
}

interface ListCampaignsResponse {
  campaigns: Campaign[];
}

export function registerListCampaigns(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "list_campaigns",
    "Lista las campañas SMS de tu cuenta, ordenadas de más reciente a más antigua. Puedes filtrar por rango de fechas. Usa el ID de campaña con get_campaign_stats para ver estadísticas de entrega.",
    listCampaignsInput.shape,
    async (params) => {
      try {
        const result = await apiCall<ListCampaignsResponse>("/campaigns", params);

        if (result.campaigns.length === 0) {
          return { content: [{ type: "text" as const, text: "No se encontraron campañas." }] };
        }

        const lines = [`${result.campaigns.length} campaña(s):\n`];
        for (const c of result.campaigns) {
          lines.push(`- [${c.id}] ${c.name} — ${c.type}, ${c.status}, ${c.create_date}`);
        }

        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      } catch (error) {
        const message = error instanceof SmsmasivosError ? error.message : String(error);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
