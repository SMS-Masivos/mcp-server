import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall } from "../api-client.js";
import { resetVerificationInput } from "../schemas.js";
import { SmsmasivosError } from "../errors.js";

interface ResetVerificationResponse {
  success?: boolean;
  message?: string;
}

export function registerResetVerification(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "reset_verification",
    "Resetea el estado de una verificación de teléfono — limpia los intentos fallidos y opcionalmente genera un código nuevo. Úsalo cuando el usuario excedió los intentos o el código expiró y quieres permitirle reintentar sin crear una verificación nueva con verify_phone.",
    resetVerificationInput.shape,
    async (params) => {
      try {
        await apiCall<ResetVerificationResponse>(
          "/protected/json/phones/verification/reset",
          params,
        );
        const action =
          params.reset_code === "1"
            ? "Verificación reseteada. Código regenerado, intentos limpiados"
            : "Verificación reseteada. Intentos limpiados (mismo código)";
        return {
          content: [{ type: "text" as const, text: `✓ ${action}.` }],
        };
      } catch (error) {
        const message = error instanceof SmsmasivosError ? error.message : String(error);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
