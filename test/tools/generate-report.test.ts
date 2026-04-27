import { describe, it, expect } from "vitest";
import { dateRangeMaxSeven, generateReportInput } from "../../src/schemas.js";

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
});
