import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall, RawResponse } from "../api-client.js";
import { sendOtpInput } from "../schemas.js";
import { formatOtp, type OtpEnvelope } from "../otp.js";
import { SmsmasivosError } from "../errors.js";

// POST /v2/otp — punto único de entrada del OTP v2: crea, reenvía, rota o cambia de canal.
// - Primera llamada: crea y envía el código (201).
// - Repetir la misma llamada: reenvía el MISMO código, sujeto a cooldown de 30s (200).
// - Con otro `channel`: el mismo código sale por el canal nuevo (fallback "no recibí el código").
// - Con `code_rotate: true`: descarta el código vigente y genera uno nuevo con 7 intentos frescos.
// El HTTP status distingue cada caso; formatOtp expone message/hint/next para que el asistente sepa qué sigue.
export function registerSendOtp(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "send_otp",
    "Genera y envía un código de verificación (OTP) por SMS, WhatsApp o llamada de voz vía POST /v2/otp. Un solo endpoint hace todo: la primera llamada crea el código; repetir la misma llamada lo reenvía (cooldown de 30s); repetirla con otro 'channel' manda el mismo código por el canal nuevo (útil para el botón «No recibí el código»); y 'code_rotate: true' genera un código nuevo y destraba una verificación bloqueada. Requiere 'company' en SMS y voz. Luego valida con verify_otp.",
    sendOtpInput.shape,
    async (params) => {
      try {
        const { status, body } = await apiCall<RawResponse>("/v2/otp", params, { raw: true });
        const env = body as OtpEnvelope;
        const ok = status >= 200 && status < 300;
        // 429 (cooldown de reenvío / locked sin rotate) es un estado recuperable, no un fallo de
        // herramienta: el asistente debe sugerir esperar `resend_available_in`s o rotar, no reportar
        // error. Coherente con verify_otp. El resto de no-2xx (400 param, 402 saldo, 5xx) sí es fallo.
        const toolError = !ok && status !== 429;
        return {
          content: [{ type: "text" as const, text: `${ok ? "✓" : "✗"} ${formatOtp(env)}` }],
          ...(toolError ? { isError: true } : {}),
        };
      } catch (error) {
        const message = error instanceof SmsmasivosError ? error.message : String(error);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
