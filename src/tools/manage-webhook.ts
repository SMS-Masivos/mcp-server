import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiCall } from "../api-client.js";
import { manageWebhookInput, schemas } from "../schemas.js";
import { SmsmasivosError } from "../errors.js";

// Excepción justificada al patrón "1 tool = 1 archivo": consolidamos las 4
// operaciones de webhook en una sola tool con `z.discriminatedUnion("action")`.
// Reduce surface y fatiga LLM en selección de tool. El sistema solo permite
// UN webhook por usuario (no hay id por entidad).
//
// El MCP SDK consume `.shape` que solo expone ZodObject. Para soportar el
// discriminator exponemos un shape "amplio" donde `action` es required y los
// demás campos son opcionales. La validación estricta por action ocurre
// dentro del handler con `manageWebhookInput.safeParse()`.

const manageWebhookShape = {
  action: z
    .enum(["list", "add", "toggle", "delete"])
    .describe(
      "Operación: 'list' (ver), 'add' (registrar/reemplazar), 'toggle' (cambiar estado), 'delete' (eliminar — DESTRUCTIVO).",
    ),
  url: schemas.webhookUrl
    .optional()
    .describe("Solo para action='add'. URL https que recibirá los eventos."),
  status: z
    .enum(["0", "1"])
    .optional()
    .describe("Solo para action='add' o 'toggle'. '1' activo, '0' inactivo."),
};

interface GetWebhookResponse {
  result: { url: string; status: string };
}

export function registerManageWebhook(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "manage_webhook",
    "Gestiona el webhook configurado para tu cuenta (uno por usuario). Acciones: 'list' (ver), 'add' (registrar o reemplazar), 'toggle' (cambiar estado), 'delete' (eliminar — DESTRUCTIVO, pide confirmación al humano antes). El webhook recibe eventos de entrega de SMS. URL debe ser https; rechaza IPs privadas y localhost.",
    manageWebhookShape,
    async (raw) => {
      try {
        // Validación estricta con discriminatedUnion (action='add' requiere url+status, etc.)
        const parsed = manageWebhookInput.safeParse(raw);
        if (!parsed.success) {
          const issue = parsed.error.issues[0];
          let msg = issue.message;
          if (issue.code === "invalid_union_discriminator") {
            msg = "Acción no válida. Usa una de: 'list', 'add', 'toggle', 'delete'.";
          }
          return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true };
        }
        const params = parsed.data;

        switch (params.action) {
          case "list": {
            const result = await apiCall<GetWebhookResponse>("/webhook/get", {});
            const w = result.result;
            if (!w?.url) {
              return {
                content: [
                  { type: "text" as const, text: "No hay webhook configurado en esta cuenta." },
                ],
              };
            }
            const statusLabel = w.status === "1" ? "activo" : "inactivo";
            return {
              content: [
                { type: "text" as const, text: `Webhook actual: ${w.url} (${statusLabel})` },
              ],
            };
          }
          case "add": {
            await apiCall("/webhook/add", { url: params.url, status: params.status });
            const statusLabel = params.status === "1" ? "activo" : "inactivo";
            return {
              content: [
                {
                  type: "text" as const,
                  text: `✓ Webhook registrado: ${params.url} (${statusLabel}).`,
                },
              ],
            };
          }
          case "toggle": {
            await apiCall("/webhook/status", { status: params.status });
            const statusLabel = params.status === "1" ? "activado" : "desactivado";
            return { content: [{ type: "text" as const, text: `✓ Webhook ${statusLabel}.` }] };
          }
          case "delete": {
            await apiCall("/webhook/delete", {});
            return {
              content: [
                { type: "text" as const, text: "✓ Webhook eliminado de la cuenta." },
              ],
            };
          }
        }
      } catch (error) {
        const message = error instanceof SmsmasivosError ? error.message : String(error);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
