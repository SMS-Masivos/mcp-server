import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall } from "../api-client.js";
import { checkVerificationInput } from "../schemas.js";
import { SmsmasivosError, ValidationError } from "../errors.js";

const VERIFICATION_CODES = new Set([
  "validation_02", // código expirado
  "validation_03", // intentos excedidos
  "validation_05", // código incorrecto
]);

interface CheckVerificationResponse {
  success: boolean;
  message: string;
}

export function registerCheckVerification(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "check_verification",
    "Verifica un código OTP previamente enviado a un número de teléfono con verify_phone. Ingresa el mismo número, código de país y el código que el usuario recibió.",
    checkVerificationInput.shape,
    async (params) => {
      try {
        const result = await apiCall<CheckVerificationResponse>(
          "/protected/json/phones/verification/check",
          params,
        );
        if (result.success) {
          return {
            content: [{ type: "text" as const, text: "✓ Código verificado correctamente." }],
          };
        }
        return {
          content: [{ type: "text" as const, text: `✗ Verificación fallida: ${result.message}` }],
        };
      } catch (error) {
        if (error instanceof ValidationError && VERIFICATION_CODES.has(error.code)) {
          return {
            content: [{ type: "text" as const, text: `✗ Verificación fallida: ${error.message}` }],
          };
        }
        const message = error instanceof SmsmasivosError ? error.message : String(error);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
