import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall, RawResponse } from "../api-client.js";
import { verifyOtpInput } from "../schemas.js";
import { formatOtp, type OtpEnvelope } from "../otp.js";
import { SmsmasivosError } from "../errors.js";

// POST /v2/otp/verify — valida el código que capturó el usuario.
// El HTTP status es el contrato: 200 verificado, 401 incorrecto (quedan intentos), 404 sin
// verificación activa, 409 ya verificado, 410 expirado, 429 intentos agotados (locked).
// Los estados 401/404/409/410/429 NO son fallos de herramienta: son resultados legítimos de la
// verificación que el asistente debe leer (formatOtp trae hint/next). Solo 400 (parámetro) y
// 5xx (interno) se marcan como isError.
export function registerVerifyOtp(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "verify_otp",
    "Verifica el código OTP que ingresó el usuario vía POST /v2/otp/verify. Envía el mismo phone_number y country_code usados en send_otp, más el 'code' capturado. Devuelve el estado de la verificación: correcto, incorrecto (con intentos restantes), expirado, ya verificado o bloqueado por intentos agotados.",
    verifyOtpInput.shape,
    async (params) => {
      try {
        const { status, body } = await apiCall<RawResponse>("/v2/otp/verify", params, { raw: true });
        const env = body as OtpEnvelope;
        const ok = status >= 200 && status < 300;
        // 401/404/409/410/429 = estados informativos de la verificación, no fallos de herramienta.
        const toolError = status === 400 || status >= 500;
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
