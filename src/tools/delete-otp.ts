import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall, RawResponse } from "../api-client.js";
import { deleteOtpInput } from "../schemas.js";
import { formatOtp, type OtpEnvelope } from "../otp.js";
import { SmsmasivosError } from "../errors.js";

// DELETE /v2/otp — invalida la verificación activa (el código vigente deja de servir). NO envía
// ningún mensaje. Útil para cancelar, cambiar de número o limpiar el estado entre pruebas.
export function registerDeleteOtp(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "delete_otp",
    "Invalida la verificación OTP activa de un número vía DELETE /v2/otp: el código vigente deja de servir y el estado vuelve a 'none'. No envía ningún mensaje. Úsalo para cancelar una verificación en curso, cambiar de número o limpiar el estado antes de un ciclo nuevo.",
    deleteOtpInput.shape,
    async (params) => {
      try {
        const { status, body } = await apiCall<RawResponse>("/v2/otp", params, {
          method: "DELETE",
          raw: true,
        });
        const env = body as OtpEnvelope;
        const ok = status >= 200 && status < 300;
        return {
          content: [{ type: "text" as const, text: `${ok ? "✓" : "✗"} ${formatOtp(env)}` }],
          ...(ok ? {} : { isError: true }),
        };
      } catch (error) {
        const message = error instanceof SmsmasivosError ? error.message : String(error);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
