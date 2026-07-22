import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall, RawResponse } from "../api-client.js";
import { getOtpStatusInput } from "../schemas.js";
import { formatOtp, type OtpEnvelope } from "../otp.js";
import { SmsmasivosError } from "../errors.js";

// GET /v2/otp/status — estado de la verificación SIN efectos secundarios: no envía mensajes, no
// consume intentos, no reinicia nada. Útil para decidir qué mostrar/hacer antes de reenviar
// (ver si hay un código activo, cuántos intentos quedan, si el cooldown de reenvío sigue corriendo).
export function registerGetOtpStatus(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "get_otp_status",
    "Consulta el estado actual de la verificación OTP de un número vía GET /v2/otp/status, sin efectos secundarios (no envía nada ni consume intentos). Devuelve el estado (none/pending/verified/expired/locked), intentos restantes, expiración y segundos hasta poder reenviar. Úsalo para decidir el siguiente paso sin disparar un envío.",
    getOtpStatusInput.shape,
    async (params) => {
      try {
        const { status, body } = await apiCall<RawResponse>("/v2/otp/status", params, {
          method: "GET",
          raw: true,
        });
        const env = body as OtpEnvelope;
        const ok = status >= 200 && status < 300;
        return {
          content: [{ type: "text" as const, text: `${ok ? "ℹ️" : "✗"} ${formatOtp(env)}` }],
          ...(ok ? {} : { isError: true }),
        };
      } catch (error) {
        const message = error instanceof SmsmasivosError ? error.message : String(error);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
