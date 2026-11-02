import { describe, it, expect } from "vitest";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall } from "../../src/api-client.js";
import { dateRangeMaxSeven, generateReportInput } from "../../src/schemas.js";
import { registerGenerateReport } from "../../src/tools/generate-report.js";

describe("generate_report — cap 7 días", () => {
  it("acepta rango de 1 día", () => {
    expect(dateRangeMaxSeven("2026-04-25", "2026-04-25")).toBe(true);
  });

  it("acepta rango de 7 días exactos", () => {
    expect(dateRangeMaxSeven("2026-04-20", "2026-04-27")).toBe(true);
  });

  it("rechaza rango de 8 días", () => {
    expect(dateRangeMaxSeven("2026-04-19", "2026-04-27")).toBe(false);
  });

  it("rechaza rango de 30 días", () => {
    expect(dateRangeMaxSeven("2026-03-27", "2026-04-27")).toBe(false);
  });

  it("rechaza start_date posterior a end_date", () => {
    expect(dateRangeMaxSeven("2026-04-27", "2026-04-20")).toBe(false);
  });

  it("rechaza fechas malformadas", () => {
    expect(dateRangeMaxSeven("not-a-date", "2026-04-27")).toBe(false);
    expect(dateRangeMaxSeven("2026-04-27", "not-a-date")).toBe(false);
  });
});

describe("generateReportInput schema base", () => {
  it("expone .shape (necesario para MCP SDK)", () => {
    expect(generateReportInput.shape).toBeDefined();
    expect(generateReportInput.shape.start_date).toBeDefined();
    expect(generateReportInput.shape.end_date).toBeDefined();
    expect(generateReportInput.shape.sandbox).toBeDefined();
  });

  it("acepta payload válido (sin refine, refine va en handler)", () => {
    const result = generateReportInput.safeParse({
      start_date: "2026-04-20",
      end_date: "2026-04-27",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza fecha en formato incorrecto", () => {
    const result = generateReportInput.safeParse({
      start_date: "27-04-2026",
      end_date: "2026-04-27",
    });
    expect(result.success).toBe(false);
  });

  it("acepta cursor opcional y rechaza cursor vacío", () => {
    const base = { start_date: "2026-04-20", end_date: "2026-04-27" };
    expect(generateReportInput.safeParse({ ...base, cursor: "MjAyNg==" }).success).toBe(true);
    expect(generateReportInput.safeParse({ ...base, cursor: "" }).success).toBe(false);
  });
});

describe("generate_report — paginación por cursor", () => {
  const row = {
    name: "Campaña", created_date: "2026-04-20 10:00:00", reference: "r1", number: "5512345678",
    message: "hola", sent_date: "2026-04-20 10:00:01", status: "Entregado", operator: "telcel", type: "sms",
  };
  const fechas = { start_date: "2026-04-20", end_date: "2026-04-27" };

  function registrar(respuesta: unknown) {
    const llamadas: Array<Record<string, unknown> | undefined> = [];
    let descripcion = "";
    let handler: (p: Record<string, unknown>) => Promise<{ content: { text: string }[]; isError?: boolean }> =
      async () => ({ content: [] });
    const server = {
      tool: (_n: string, d: string, _s: unknown, h: typeof handler) => { descripcion = d; handler = h; },
    };
    const apiCall = (async (_e: string, p?: Record<string, unknown>) => { llamadas.push(p); return respuesta; }) as ApiCall;
    registerGenerateReport(server as unknown as McpServer, apiCall);
    return { llamadas, descripcion: () => descripcion, correr: (p: Record<string, unknown>) => handler(p) };
  }

  it("con has_more avisa que está incompleto y da el cursor siguiente", async () => {
    const t = registrar({ report: [row], pagination: { has_more: true, next_cursor: "MjAyNi0wNC0yMg==" } });
    const texto = (await t.correr(fechas)).content[0].text;
    expect(texto).toContain("INCOMPLETO");
    expect(texto).toContain('cursor="MjAyNi0wNC0yMg=="');
    expect(texto).toContain("10 consultas");
  });

  it("sin has_more (o sin pagination) no avisa nada", async () => {
    for (const respuesta of [
      { report: [row], pagination: { has_more: false, next_cursor: null } },
      { report: [row] },
    ]) {
      const texto = (await registrar(respuesta).correr(fechas)).content[0].text;
      expect(texto).not.toContain("INCOMPLETO");
      expect(texto).not.toContain("cursor");
    }
  });

  it("con has_more pero sin next_cursor manda al panel", async () => {
    const t = registrar({ report: [row], pagination: { has_more: true, next_cursor: null } });
    const texto = (await t.correr(fechas)).content[0].text;
    expect(texto).toContain("INCOMPLETO");
    expect(texto).toContain("panel");
    expect(texto).not.toContain("cursor=");
  });

  it("manda el cursor a /reports/generate solo cuando se lo dan", async () => {
    const t = registrar({ report: [row] });
    await t.correr({ ...fechas, cursor: "MjAyNi0wNC0yMg==" });
    await t.correr(fechas);
    expect(t.llamadas[0]?.cursor).toBe("MjAyNi0wNC0yMg==");
    expect(t.llamadas[1]).not.toHaveProperty("cursor");
  });

  it("página vacía tras un cursor dice que no hay más", async () => {
    const texto = (await registrar({ report: [] }).correr({ ...fechas, cursor: "MjAyNi0wNC0yMg==" })).content[0].text;
    expect(texto).toContain("No hay más mensajes");
  });

  it("la descripción da el límite real: 10 consultas al día", () => {
    const d = registrar({ report: [] }).descripcion();
    expect(d).toContain("10 consultas");
    expect(d).not.toContain("4 reportes");
  });
});
