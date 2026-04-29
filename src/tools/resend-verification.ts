import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall } from "../api-client.js";
import { resendVerificationInput } from "../schemas.js";
import { SmsmasivosError } from "../errors.js";

interface ResendVerificationResponse {
  number?: string;
  credit?: number;
  reference?: string;
}

export function registerResendVerification(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "resend_verification",
    "Reenvía un código OTP a un número que ya tenía una verificación activa con verify_phone. Útil cuando el usuario reporta que no le llegó el SMS. Por default reenvía el mismo código; pasa reset_code='1' para regenerar uno nuevo.",
    resendVerificationInput.shape,
    async (params) => {
      try {
        const result = await apiCall<ResendVerificationResponse>(
          "/protected/json/phones/verification/resend",
          params,
        );
        const parts = ["✓ Código de verificación reenviado"];
        if (result.number) parts.push(`a ${result.number}`);
        if (result.reference) parts.push(`(referencia: ${result.reference})`);
        if (typeof result.credit === "number") parts.push(`. Créditos restantes: ${result.credit}`);
        return {
          content: [{ type: "text" as const, text: parts.join(" ") + "." }],
        };
      } catch (error) {
        const message = error instanceof SmsmasivosError ? error.message : String(error);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
