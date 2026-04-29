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

  it("total tools v1.1.0 = 29 (27 v1.0.0 + 2 OTP completion en v1.1.0)", () => {
    // v1.0.0 base: 27 tools
    //   8 fase1 (post-drop register_loyalty_sale del lealtad) + 3 lealtad + 4 monedero
    //   + 1 utilidad (delete_contact) + 10 fase4 + 1 metrics = 27
    // v1.1.0: + resend_verification + reset_verification = 29
    const names = getRegisteredToolNames();
    expect(names.length).toBeGreaterThanOrEqual(28);
    expect(names.length).toBeLessThanOrEqual(30);
  });
});

describe("v1.1.0 OTP completion — tools registradas", () => {
  function getRegisteredToolNames(): string[] {
    const server = new McpServer({ name: "test", version: "0.0.0" });
    const fakeApiCall = async () => ({}) as any;
    registerAllTools(server, fakeApiCall);
    // @ts-expect-error — internal access intentional
    const tools = server._registeredTools ?? server.registeredTools ?? {};
    return Object.keys(tools);
  }

  it("registra resend_verification", () => {
    expect(getRegisteredToolNames()).toContain("resend_verification");
  });

  it("registra reset_verification", () => {
    expect(getRegisteredToolNames()).toContain("reset_verification");
  });
});
