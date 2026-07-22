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

  it("total tools = 30 (26 no-OTP + 4 OTP v2)", () => {
    // Base no-OTP: 26 tools
    //   7 fase1 no-OTP (check_balance, send_sms, list_agendas, get_contacts, add_contact,
    //   get_campaign_stats, list_campaigns) + 3 lealtad + 4 monedero + 1 utilidad (delete_contact)
    //   + 6 fase3 (create/rename/delete/find_agenda, update/duplicate_contact)
    //   + 4 fase4 (manage_webhook, generate_report, get_report_details, send_payment_request)
    //   + 1 metrics (get_metrics) = 26 (verify_phone/check_verification v1 removidas)
    // OTP v2: + send_otp + verify_otp + get_otp_status + delete_otp = 30
    const names = getRegisteredToolNames();
    expect(names.length).toBe(30);
  });
});

describe("OTP v2 — tools registradas y v1 removidas", () => {
  function getRegisteredToolNames(): string[] {
    const server = new McpServer({ name: "test", version: "0.0.0" });
    const fakeApiCall = async () => ({}) as any;
    registerAllTools(server, fakeApiCall);
    // @ts-expect-error — internal access intentional
    const tools = server._registeredTools ?? server.registeredTools ?? {};
    return Object.keys(tools);
  }

  for (const name of ["send_otp", "verify_otp", "get_otp_status", "delete_otp"]) {
    it(`registra ${name}`, () => {
      expect(getRegisteredToolNames()).toContain(name);
    });
  }

  // Las tools OTP v1 fueron REEMPLAZADAS por las v2 (endpoints /protected/.../verification/*
  // deprecados). Si alguien las re-registra por error, este guard falla.
  for (const name of ["verify_phone", "check_verification", "resend_verification", "reset_verification"]) {
    it(`NO registra ${name} (OTP v1 deprecado)`, () => {
      expect(getRegisteredToolNames()).not.toContain(name);
    });
  }
});
