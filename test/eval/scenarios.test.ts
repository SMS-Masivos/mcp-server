import { describe, it, expect, beforeAll } from "vitest";
import Anthropic from "@anthropic-ai/sdk";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAllTools } from "../../src/tools/index.js";

// Eval suite: el LLM debe elegir la tool correcta dado un prompt natural.
// Ejecutar con `npm run test:eval`. Requiere ANTHROPIC_API_KEY.

const HAS_KEY = Boolean(process.env.ANTHROPIC_API_KEY);
const MODEL =
  process.env.EVAL_MODEL === "sonnet"
    ? "claude-sonnet-4-6"
    : "claude-haiku-4-5-20251001";

interface Scenario {
  prompt: string;
  expectedTool: string;
  expectedArgs?: Record<string, unknown>;
  // Si el LLM debe pedir confirmación antes (ej. delete_agenda destructiva),
  // marcamos `expectsConfirmation: true` y aceptamos respuesta de texto.
  expectsConfirmation?: boolean;
}

const scenarios: Scenario[] = [
  // Agendas CRUD
  {
    prompt: "Crea una agenda llamada 'Clientes VIP'",
    expectedTool: "create_agenda",
    expectedArgs: { agenda_name: "Clientes VIP" },
  },
  {
    prompt: "Cambia el nombre de la agenda con clave abc-123 a 'Prospectos Q2'",
    expectedTool: "rename_agenda",
    expectedArgs: { list_key: "abc-123", agenda_name: "Prospectos Q2" },
  },
  {
    prompt: "Busca agendas que tengan 'cliente' en el nombre",
    expectedTool: "find_agenda",
    expectedArgs: { query: "cliente" },
  },
  {
    prompt: "Lista todas mis agendas",
    expectedTool: "list_agendas",
  },

  // Contactos
  {
    prompt:
      "Actualiza el contacto 5512345678 en la agenda abc-123 con el nombre 'Juan Pérez'",
    expectedTool: "update_contact",
    expectedArgs: { list_key: "abc-123", number: "5512345678", name: "Juan Pérez" },
  },
  {
    prompt: "Agrega 5598765432 a la agenda xyz-789",
    expectedTool: "add_contact",
  },

  // Webhooks (discriminator)
  {
    prompt: "¿Cuál es mi webhook configurado actualmente?",
    expectedTool: "manage_webhook",
    expectedArgs: { action: "list" },
  },
  {
    prompt: "Registra un webhook hacia https://hooks.example.com/sms y actívalo",
    expectedTool: "manage_webhook",
    expectedArgs: { action: "add", url: "https://hooks.example.com/sms", status: "1" },
  },
  {
    prompt: "Desactiva el webhook",
    expectedTool: "manage_webhook",
    expectedArgs: { action: "toggle", status: "0" },
  },

  // Reports
  {
    prompt: "Dame el reporte de la campaña con id 12345",
    expectedTool: "get_report_details",
    expectedArgs: { campaign_id: "12345" },
  },
  {
    prompt: "Genera reporte detallado de SMS del 1 al 5 de abril",
    expectedTool: "generate_report",
  },

  // Operación
  {
    prompt: "Manda solicitud de pago al 5512345678 con template tok_abc por 500 pesos",
    expectedTool: "send_payment_request",
    expectedArgs: { template: "tok_abc", number: "5512345678", amount: 500 },
  },

  // SMS y balance (regresión: tools existentes siguen funcionando)
  {
    prompt: "¿Cuántos créditos me quedan?",
    expectedTool: "check_balance",
  },
  {
    prompt: "Envía 'Hola' al 5512345678",
    expectedTool: "send_sms",
  },
];

describe.skipIf(!HAS_KEY)(`MCP tool selection eval (${MODEL})`, () => {
  let client: Anthropic;
  let toolDefs: Anthropic.Messages.Tool[];

  beforeAll(() => {
    client = new Anthropic();

    // Extraer definiciones de tools del MCP server reflejando lo que el LLM ve.
    const server = new McpServer({ name: "smsmasivos", version: "1.0.0" });
    const fakeApiCall = async () => ({}) as any;
    registerAllTools(server, fakeApiCall);
    // @ts-expect-error — internal access intentional para eval suite
    const registered = server._registeredTools ?? server.registeredTools ?? {};
    toolDefs = Object.entries(registered).map(([name, def]: [string, any]) => ({
      name,
      description: def.description ?? "",
      input_schema: def.inputSchema ?? { type: "object", properties: {} },
    }));
  });

  for (const s of scenarios) {
    it(`elige ${s.expectedTool} para: "${s.prompt}"`, async () => {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        tools: toolDefs,
        messages: [{ role: "user", content: s.prompt }],
      });

      const toolUse = res.content.find((c) => c.type === "tool_use");
      expect(toolUse, `Esperaba tool_use para "${s.prompt}", recibí: ${JSON.stringify(res.content)}`).toBeDefined();

      if (toolUse && toolUse.type === "tool_use") {
        expect(toolUse.name).toBe(s.expectedTool);

        if (s.expectedArgs) {
          for (const [key, val] of Object.entries(s.expectedArgs)) {
            expect((toolUse.input as Record<string, unknown>)[key]).toBe(val);
          }
        }
      }
    });
  }
});

describe.skipIf(HAS_KEY)("eval suite skip notice", () => {
  it("requires ANTHROPIC_API_KEY (set env var to run evals)", () => {
    expect(true).toBe(true);
  });
});
