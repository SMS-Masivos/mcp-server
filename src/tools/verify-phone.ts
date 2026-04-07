import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall } from "../api-client.js";
import { verifyPhoneInput } from "../schemas.js";
import { SmsmasivosError } from "../errors.js";

interface VerifyPhoneResponse {
  number: string;
  credit: number;
  reference: string;
}

export function registerVerifyPhone(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "verify_phone",
    "Inicia una verificación de número de teléfono enviando un código OTP por SMS. Opcionalmente puede enviarse por llamada de voz o WhatsApp. Después usa check_verification para verificar el código que ingrese el usuario.",
    verifyPhoneInput.shape,
    async (params) => {
      try {
        const result = await apiCall<VerifyPhoneResponse>(
          "/protected/json/phones/verification/start",
          params,
        );
        return {
          content: [
            {
              type: "text" as const,
              text: `✓ Código de verificación enviado a ${result.number}. Referencia: ${result.reference}. Créditos restantes: ${result.credit}`,
            },
          ],
        };
      } catch (error) {
        const message = error instanceof SmsmasivosError ? error.message : String(error);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
