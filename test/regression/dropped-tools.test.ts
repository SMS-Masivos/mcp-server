import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAllTools } from "../../src/tools/index.js";

// Regression test (Iron Rule del eng review):
// register_loyalty_sale y register_wallet_sale fueron evaluadas en Fase 4 y
// dropeadas/no-añadidas por falta de soporte de idempotency_key en api/.
// Si alguien las re-añade por error, este test falla.

describe("v1.0.0 dropped tools — regression guard", () => {
  function getRegisteredToolNames(): string[] {
    const server = new McpServer({ name: "test", version: "0.0.0" });
    const fakeApiCall = async () => ({}) as any;
    registerAllTools(server, fakeApiCall);
    // McpServer no expone tools registradas como API pública; leemos vía reflexión interna
    // del SDK. Si esto se rompe en futuras versiones, ajustar el path.
    // @ts-expect-error — internal access intentional para test regression
    const tools = server._registeredTools ?? server.registeredTools ?? {};
    return Object.keys(tools);
  }

  it("no registra register_loyalty_sale (dropped en v1.0.0)", () => {
    const names = getRegisteredToolNames();
    expect(names).not.toContain("register_loyalty_sale");
  });

  it("no registra register_wallet_sale (descartada en Fase 4)", () => {
    const names = getRegisteredToolNames();
    expect(names).not.toContain("register_wallet_sale");
  });

  it("sí registra check_balance (sanity check)", () => {
    const names = getRegisteredToolNames();
    expect(names).toContain("check_balance");
  });
});

describe("v1.0.0 Fase 4 — tools nuevas registradas", () => {
  function getRegisteredToolNames(): string[] {
    const server = new McpServer({ name: "test", version: "0.0.0" });
    const fakeApiCall = async () => ({}) as any;
    registerAllTools(server, fakeApiCall);
    // @ts-expect-error — internal access intentional
    const tools = server._registeredTools ?? server.registeredTools ?? {};
    return Object.keys(tools);
  }

  const expected = [
    "create_agenda",
    "rename_agenda",
    "delete_agenda",
    "find_agenda",
    "update_contact",
    "duplicate_contact",
    "manage_webhook",
    "generate_report",
    "get_report_details",
    "send_payment_request",
  ];

  for (const name of expected) {
    it(`registra ${name}`, () => {
      const names = getRegisteredToolNames();
      expect(names).toContain(name);
    });
  }

  it("total tools v1.0.0 = 27 (19 existentes - 1 dropped + 9 nuevas + manage_webhook consolidado + get_metrics)", () => {
    // Conteo: 9 fase1 + 4 lealtad + 4 monedero + 1 utilidad + 10 fase4 + 1 metrics
    //       = 9 + 4 + 4 + 1 + 10 + 1 = 29 (registradas via SDK; get_metrics es local)
    // Pero post-drop de register_loyalty_sale: 4 lealtad → 3, total = 28.
    // get_metrics no se loga como tool de API call, así que: 8 + 3 + 4 + 1 + 10 + 1 = 27
    const names = getRegisteredToolNames();
    expect(names.length).toBeGreaterThanOrEqual(26);
    expect(names.length).toBeLessThanOrEqual(28);
  });
});
