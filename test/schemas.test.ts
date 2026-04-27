import { describe, it, expect } from "vitest";
import { schemas } from "../src/schemas.js";

describe("webhookUrl schema", () => {
  it("acepta URL https con dominio público", () => {
    const result = schemas.webhookUrl.safeParse("https://hooks.example.com/webhook");
    expect(result.success).toBe(true);
  });

  it("acepta URL https con path y query", () => {
    const result = schemas.webhookUrl.safeParse(
      "https://api.example.com/v1/hook?token=abc",
    );
    expect(result.success).toBe(true);
  });

  it("rechaza URL http (no https)", () => {
    const result = schemas.webhookUrl.safeParse("http://example.com/hook");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("https");
    }
  });

  it("rechaza URL malformada", () => {
    const result = schemas.webhookUrl.safeParse("not-a-url");
    expect(result.success).toBe(false);
  });

  it("rechaza localhost", () => {
    const result = schemas.webhookUrl.safeParse("https://localhost/hook");
    expect(result.success).toBe(false);
  });

  it("rechaza 127.0.0.1 (loopback)", () => {
    const result = schemas.webhookUrl.safeParse("https://127.0.0.1/hook");
    expect(result.success).toBe(false);
  });

  it("rechaza 127.x.x.x range completo", () => {
    const result = schemas.webhookUrl.safeParse("https://127.1.2.3/hook");
    expect(result.success).toBe(false);
  });

  it("rechaza 10.x.x.x (privada)", () => {
    const result = schemas.webhookUrl.safeParse("https://10.0.0.1/hook");
    expect(result.success).toBe(false);
  });

  it("rechaza 192.168.x.x (privada)", () => {
    const result = schemas.webhookUrl.safeParse("https://192.168.1.100/hook");
    expect(result.success).toBe(false);
  });

  it("rechaza 172.16.x.x – 172.31.x.x (privada)", () => {
    expect(schemas.webhookUrl.safeParse("https://172.16.0.1/hook").success).toBe(false);
    expect(schemas.webhookUrl.safeParse("https://172.20.5.5/hook").success).toBe(false);
    expect(schemas.webhookUrl.safeParse("https://172.31.255.254/hook").success).toBe(false);
  });

  it("acepta 172.x fuera del rango privado", () => {
    expect(schemas.webhookUrl.safeParse("https://172.15.0.1/hook").success).toBe(true);
    expect(schemas.webhookUrl.safeParse("https://172.32.0.1/hook").success).toBe(true);
  });

  it("rechaza IPv6 loopback ::1", () => {
    const result = schemas.webhookUrl.safeParse("https://[::1]/hook");
    expect(result.success).toBe(false);
  });

  it("rechaza IPv6 link-local fe80:", () => {
    const result = schemas.webhookUrl.safeParse("https://[fe80::1]/hook");
    expect(result.success).toBe(false);
  });

  it("acepta dominio que CONTIENE 'localhost' como substring", () => {
    // hostname check exacto, no substring
    const result = schemas.webhookUrl.safeParse("https://my-localhost-domain.com/hook");
    expect(result.success).toBe(true);
  });
});

describe("phoneNumber schema (regression)", () => {
  it("acepta 10 dígitos", () => {
    expect(schemas.phoneNumber.safeParse("5512345678").success).toBe(true);
  });

  it("rechaza menos de 10", () => {
    expect(schemas.phoneNumber.safeParse("12345").success).toBe(false);
  });

  it("rechaza con espacios", () => {
    expect(schemas.phoneNumber.safeParse("55 1234 5678").success).toBe(false);
  });
});
