import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall } from "../api-client.js";
import { sendPaymentRequestInput } from "../schemas.js";
import { SmsmasivosError } from "../errors.js";

interface SendPaymentRequestResponse {
  url?: string;
  short_url?: string;
  token?: string;
}

export function registerSendPaymentRequest(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "send_payment_request",
    "Envía una solicitud de pago a un cliente vía SMS usando un template configurado en la cuenta. El template debe existir y estar activo en la sección de Solicitudes de Pago. El cliente recibe un SMS con link corto a la página de pago.",
    sendPaymentRequestInput.shape,
    async (params) => {
      try {
        const result = await apiCall<SendPaymentRequestResponse>("/paymentrequest/send", params);
        const link = result.short_url || result.url;
        const lines = [`✓ Solicitud de pago enviada a ${params.number}.`];
        if (params.amount !== undefined) lines.push(`Monto: ${params.amount}`);
        if (link) lines.push(`Link: ${link}`);
        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      } catch (error) {
        let message = error instanceof SmsmasivosError ? error.message : String(error);
        if (/template/i.test(message)) {
          message +=
            ". Verifica que el token de template exista y esté activo en tu panel (Solicitudes de Pago).";
        }
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
