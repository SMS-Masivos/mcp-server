import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall } from "../api-client.js";
import { listCampaignsInput, dateRangeMaxDays, LIST_CAMPAIGNS_MAX_DAYS } from "../schemas.js";
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
  pagination?: { has_more?: boolean; next_cursor?: string | null };
}

const DAY_MS = 24 * 60 * 60 * 1000;

function ymd(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function registerListCampaigns(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "list_campaigns",
    "Lista las campañas SMS de tu cuenta, de más reciente a más antigua, hasta 50 por consulta (máximo 100). Rango máximo de 31 días; si no das fechas usa los últimos 31 días. Para historia más larga usa el panel web. Si la respuesta dice que hay más, pide la siguiente página solo si el usuario la necesita, con las mismas fechas, el mismo sandbox y el cursor indicado. Es una consulta pesada con un cupo diario por cuenta: no la repitas en bucle ni la uses para vigilar estados; para recibir el estado de los envíos en tiempo real configura el webhook de reportes. Usa el ID de campaña con get_campaign_stats para ver estadísticas de entrega.",
    listCampaignsInput.shape,
    async (params) => {
      try {
        const apiParams = { ...params };
        // Sin fechas: últimos 31 días. Con una sola, la otra se completa dentro del tope.
        if (!apiParams.start_date && !apiParams.end_date) {
          const today = Date.now();
          apiParams.end_date = ymd(today);
          apiParams.start_date = ymd(today - (LIST_CAMPAIGNS_MAX_DAYS - 1) * DAY_MS);
        } else if (!apiParams.end_date && apiParams.start_date) {
          apiParams.end_date = ymd(Date.now());
        } else if (!apiParams.start_date && apiParams.end_date) {
          const end = Date.parse(apiParams.end_date);
          if (!Number.isNaN(end)) apiParams.start_date = ymd(end - (LIST_CAMPAIGNS_MAX_DAYS - 1) * DAY_MS);
        }
        if (
          !apiParams.start_date ||
          !apiParams.end_date ||
          !dateRangeMaxDays(apiParams.start_date, apiParams.end_date, LIST_CAMPAIGNS_MAX_DAYS)
        ) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: El rango máximo permitido es ${LIST_CAMPAIGNS_MAX_DAYS} días (con start_date no posterior a end_date). Para historia más larga usa el panel web o pide ventanas de ${LIST_CAMPAIGNS_MAX_DAYS} días.`,
              },
            ],
            isError: true,
          };
        }
        // Append time to end_date so BETWEEN covers the full day
        if (!apiParams.end_date.includes(" ")) {
          apiParams.end_date = `${apiParams.end_date} 23:59:59`;
        }
        const result = await apiCall<ListCampaignsResponse>("/campaigns", apiParams);

        const hasMore = result.pagination?.has_more === true;
        const nextCursor = result.pagination?.next_cursor;
        const siguiente = hasMore
          ? nextCursor
            ? `\nHay más campañas. Pide la página siguiente solo si el usuario la necesita: invoca con las mismas start_date, end_date y sandbox, y cursor="${nextCursor}". Cada página cuenta para el cupo diario de la cuenta.`
            : "\nHay más campañas, pero la API no indicó cómo pedir la siguiente página: acota el rango de fechas o usa el panel web."
          : "";

        if (result.campaigns.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: hasMore
                  ? `Esta página no trajo campañas, pero la API indica que hay más.${siguiente}`
                  : params.cursor
                    ? "No hay más campañas después de ese cursor."
                    : "No se encontraron campañas.",
              },
            ],
          };
        }

        const lines = [`${result.campaigns.length} campaña(s)${hasMore ? " en esta página, y hay más" : ""}:\n`];
        for (const c of result.campaigns) {
          lines.push(`- [${c.id}] ${c.name} — ${c.type}, ${c.status}, ${c.create_date}`);
        }
        if (siguiente) lines.push(siguiente);

        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      } catch (error) {
        const message = error instanceof SmsmasivosError ? error.message : String(error);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
