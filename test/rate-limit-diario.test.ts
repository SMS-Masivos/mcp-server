import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { mockFetch } from "./setup.js";
import { createApiClient } from "../src/api-client.js";
import { DailyRateLimitError, RateLimitError } from "../src/errors.js";
import { registerListCampaigns } from "../src/tools/list-campaigns.js";
import { registerGetCampaignStats } from "../src/tools/get-campaign-stats.js";
import { registerGetReportDetails } from "../src/tools/get-report-details.js";
import { listCampaignsInput, dateRangeMaxDays } from "../src/schemas.js";
import { registerFaqResources } from "../src/resources/faq.js";

function jsonResponse(body: object, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

// Cuerpo real del Worker (api-smsmasivos-worker, src/dailyEndpointLimit.js).
const dailyBody = {
  success: false,
  status: 429,
  code: "rate_limit_daily",
  message: "Llegaste al límite de 10 consultas por día a /campaigns.",
  limit: 10,
  retry_after_seconds: 43200,
};

type Handler = (p: Record<string, unknown>) => Promise<{ content: { text: string }[]; isError?: boolean }>;

function registrar(register: (s: McpServer, a: never) => void, apiCall: unknown) {
  let handler: Handler = async () => ({ content: [] });
  let descripcion = "";
  const server = { tool: (_n: string, d: string, _s: unknown, h: Handler) => { descripcion = d; handler = h; } };
  register(server as unknown as McpServer, apiCall as never);
  return { correr: (p: Record<string, unknown>) => handler(p), descripcion: () => descripcion };
}

describe("User-Agent propio", () => {
  beforeEach(() => vi.clearAllMocks());

  it("manda smsmasivos-mcp/<versión de package.json> en cada petición", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }));
    await createApiClient({ apiKey: "k" })("/credits/consult");
    const headers = (mockFetch.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    const { version } = (await import("../package.json", { with: { type: "json" } })).default as { version: string };
    expect(headers["User-Agent"]).toBe(`smsmasivos-mcp/${version}`);
  });
});

describe("429 rate_limit_daily", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza DailyRateLimitError sin dormir y sin segundo fetch aunque Retry-After sea de horas", async () => {
    mockFetch.mockResolvedValue(jsonResponse(dailyBody, 429, { "Retry-After": "43200" }));
    const t0 = Date.now();
    const error = await createApiClient({ apiKey: "k" })("/campaigns").catch((e) => e);
    expect(Date.now() - t0).toBeLessThan(1000);
    expect(error).toBeInstanceOf(DailyRateLimitError);
    expect(error.code).toBe("rate_limit_daily");
    expect(error.retryAfter).toBe(43200);
    expect(error.limit).toBe(10);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("un 429 normal con espera corta sigue reintentando una vez", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({}, 429, { "Retry-After": "0" }))
      .mockResolvedValueOnce(jsonResponse({ success: true, credit: 5 }));
    const r = await createApiClient({ apiKey: "k" })<{ credit: number }>("/credits/consult");
    expect(r.credit).toBe(5);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("un 429 normal que pide esperar más de 10 s no se duerme: RateLimitError con su retryAfter", async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, 429, { "Retry-After": "3600" }));
    const t0 = Date.now();
    const error = await createApiClient({ apiKey: "k" })("/credits/consult").catch((e) => e);
    expect(Date.now() - t0).toBeLessThan(1000);
    expect(error).toBeInstanceOf(RateLimitError);
    expect(error).not.toBeInstanceOf(DailyRateLimitError);
    expect(error.retryAfter).toBe(3600);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["list_campaigns", registerListCampaigns, {}],
    ["get_campaign_stats", registerGetCampaignStats, { campaign_id: "1" }],
    ["get_report_details", registerGetReportDetails, { campaign_id: "1" }],
  ])("%s responde al agente que no reintente y remite al webhook", async (_n, register, params) => {
    mockFetch.mockResolvedValue(jsonResponse(dailyBody, 429, { "Retry-After": "43200" }));
    const t = registrar(register as never, createApiClient({ apiKey: "k" }));
    const out = await t.correr(params as Record<string, unknown>);
    expect(out.isError).toBe(true);
    expect(out.content[0].text).toContain("NO reintentes");
    expect(out.content[0].text).toContain("webhook");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe("list_campaigns — rango de 31 días y paginación", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-20T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  function conRespuesta(respuesta: unknown) {
    const llamadas: Array<Record<string, unknown>> = [];
    const apiCall = async (_e: string, p: Record<string, unknown>) => { llamadas.push(p); return respuesta; };
    return { llamadas, t: registrar(registerListCampaigns as never, apiCall) };
  }

  it("sin fechas pide los últimos 31 días (hoy incluido)", async () => {
    const { llamadas, t } = conRespuesta({ campaigns: [] });
    await t.correr({});
    expect(llamadas[0].start_date).toBe("2026-10-21");
    expect(llamadas[0].end_date).toBe("2026-11-20 23:59:59");
  });

  it("con solo start_date completa end_date con hoy; con solo end_date resta 30 días", async () => {
    const a = conRespuesta({ campaigns: [] });
    await a.t.correr({ start_date: "2026-11-01" });
    expect(a.llamadas[0].end_date).toBe("2026-11-20 23:59:59");
    const b = conRespuesta({ campaigns: [] });
    await b.t.correr({ end_date: "2026-11-10" });
    expect(b.llamadas[0].start_date).toBe("2026-10-11");
  });

  it("rechaza rangos de más de 31 días sin llamar a la API", async () => {
    const { llamadas, t } = conRespuesta({ campaigns: [] });
    const out = await t.correr({ start_date: "2026-06-01", end_date: "2026-11-20" });
    expect(out.isError).toBe(true);
    expect(out.content[0].text).toContain("31 días");
    expect(llamadas).toHaveLength(0);
  });

  it("acepta exactamente 31 días y rechaza 32", () => {
    expect(dateRangeMaxDays("2026-10-20", "2026-11-20", 31)).toBe(true);
    expect(dateRangeMaxDays("2026-10-19", "2026-11-20", 31)).toBe(false);
  });

  it("pasa el cursor a la API y, con has_more, da el cursor siguiente", async () => {
    const { llamadas, t } = conRespuesta({
      campaigns: [{ id: 1, name: "A", create_date: "2026-11-19", type: "SMS", status: "completed" }],
      pagination: { has_more: true, next_cursor: "abc==" },
    });
    const out = await t.correr({ start_date: "2026-11-01", end_date: "2026-11-20", cursor: "prev==" });
    expect(llamadas[0].cursor).toBe("prev==");
    expect(out.content[0].text).toContain('cursor="abc=="');
    expect(out.content[0].text).toContain("hay más");
  });

  it("sin pagination (api sin cursor todavía) no avisa nada", async () => {
    const { t } = conRespuesta({
      campaigns: [{ id: 1, name: "A", create_date: "2026-11-19", type: "SMS", status: "completed" }],
    });
    const texto = (await t.correr({})).content[0].text;
    expect(texto).not.toContain("cursor");
    expect(texto).toContain("1 campaña(s):");
  });

  it("has_more sin next_cursor manda a acotar o al panel", async () => {
    const { t } = conRespuesta({ campaigns: [], pagination: { has_more: true, next_cursor: null } });
    expect((await t.correr({})).content[0].text).toContain("panel web");
  });

  it("el schema expone cursor y la descripción avisa del cupo y del webhook", () => {
    expect(listCampaignsInput.shape.cursor).toBeDefined();
    const { descripcion } = registrar(registerListCampaigns as never, async () => ({}));
    expect(descripcion()).toContain("cupo diario");
    expect(descripcion()).toContain("webhook");
  });
});

describe("FAQ", () => {
  function textoFaq(): string {
    const textos: string[] = [];
    const server = {
      registerResource: (_t: string, _u: string, _m: unknown, leer: () => { contents: { text: string }[] }) => {
        textos.push(leer().contents[0].text);
      },
    };
    registerFaqResources(server as unknown as McpServer);
    return textos.join("\n");
  }

  it("no sugiere sandbox='1' como primera opción de list_campaigns y documenta el cupo diario", () => {
    const faq = textoFaq();
    expect(faq).not.toContain("usa `sandbox='1'` para ver campañas de prueba");
    expect(faq).toContain("solo si el usuario pide expresamente campañas de prueba");
    expect(faq).toContain("rate_limit_daily");
  });
});
