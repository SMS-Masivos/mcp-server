import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall } from "../api-client.js";
import { checkVerificationInput } from "../schemas.js";
import { SmsmasivosError } from "../errors.js";

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
        const message = error instanceof SmsmasivosError ? error.message : String(error);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
