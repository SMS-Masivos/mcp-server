import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall } from "../api-client.js";
import { sendSmsInput } from "../schemas.js";
import { SmsmasivosError } from "../errors.js";

interface SendSmsResponse {
  total_messages: number;
  references: Array<{ reference: string; number: string }>;
  credit: number;
  campaignId?: number;
}

export function registerSendSms(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "send_sms",
    "Envía uno o varios mensajes SMS a través de SMS Masivos. Requiere números de teléfono (separados por coma, máximo 500), texto del mensaje y código de país. Usa sandbox='1' para pruebas sin envío real. El código de país por defecto es 52 (México).",
    sendSmsInput.shape,
    async (params) => {
      try {
        const result = await apiCall<SendSmsResponse>("/sms/send", {
          ...params,
          showCampaignId: "true",
        });

        const lines = [
          `✓ ${result.total_messages} mensaje(s) enviado(s)`,
          `Créditos restantes: ${result.credit}`,
        ];
        if (result.campaignId) {
          lines.push(`ID de campaña: ${result.campaignId} (úsalo con get_campaign_stats para ver resultados)`);
        }

        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      } catch (error) {
        const message = error instanceof SmsmasivosError ? error.message : String(error);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
