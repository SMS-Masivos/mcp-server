import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockFetch } from "../setup.js";
import { createApiClient } from "../../src/api-client.js";

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("check_balance tool logic", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns credit balance from API", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true, credit: 150.5 }));

    const apiCall = createApiClient({ apiKey: "test", baseUrl: "https://test.api.com" });
    const result = await apiCall<{ credit: number }>("/credits/consult");

    expect(result.credit).toBe(150.5);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://test.api.com/credits/consult",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("throws on auth failure", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: false }, 401));

    const apiCall = createApiClient({ apiKey: "bad", baseUrl: "https://test.api.com" });

    await expect(apiCall("/credits/consult")).rejects.toThrow("API key inválida");
  });
});

describe("send_sms tool logic", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends SMS and returns campaign info", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        success: true,
        total_messages: 2,
        references: [
          { reference: "ref1", number: "5512345678" },
          { reference: "ref2", number: "5598765432" },
        ],
        credit: 98,
        campaignId: 12345,
      }),
    );

    const apiCall = createApiClient({ apiKey: "test", baseUrl: "https://test.api.com" });
    const result = await apiCall<{ total_messages: number; campaignId: number }>("/sms/send", {
      numbers: "5512345678,5598765432",
      message: "Hola mundo",
      country_code: "52",
      showCampaignId: "true",
    });

    expect(result.total_messages).toBe(2);
    expect(result.campaignId).toBe(12345);
  });

  it("throws on insufficient credits", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ success: false, message: "Insufficient credits", code: "sms_06" }),
    );

    const apiCall = createApiClient({ apiKey: "test", baseUrl: "https://test.api.com" });

    await expect(apiCall("/sms/send", { numbers: "5512345678", message: "test", country_code: "52" })).rejects.toThrow(
      "Insufficient credits",
    );
  });
});

describe("list_agendas tool logic", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns list of agendas", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        success: true,
        result: [
          { agenda_name: "VIP", agenda_description: "Clientes VIP", agenda_creation_date: "2024-01-01", list_key: "abc123" },
        ],
      }),
    );

    const apiCall = createApiClient({ apiKey: "test", baseUrl: "https://test.api.com" });
    const result = await apiCall<{ result: Array<{ agenda_name: string; list_key: string }> }>("/agendas/get");

    expect(result.result).toHaveLength(1);
    expect(result.result[0].agenda_name).toBe("VIP");
    expect(result.result[0].list_key).toBe("abc123");
  });

  it("returns empty array when no agendas", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true, result: [] }));

    const apiCall = createApiClient({ apiKey: "test", baseUrl: "https://test.api.com" });
    const result = await apiCall<{ result: unknown[] }>("/agendas/get");

    expect(result.result).toHaveLength(0);
  });
});

describe("get_campaign_stats tool logic", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns campaign statistics", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        success: true,
        details: { effectiveness: 94.4, totals: 2450, delivered: 2312, failed: 138, pending: 0, not_charged: 0 },
      }),
    );

    const apiCall = createApiClient({ apiKey: "test", baseUrl: "https://test.api.com" });
    const result = await apiCall<{ details: { effectiveness: number; delivered: number } }>("/reports/details", {
      campaign_id: "12345",
    });

    expect(result.details.effectiveness).toBe(94.4);
    expect(result.details.delivered).toBe(2312);
  });

  it("throws on campaign still processing", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ success: false, message: "Campaign is still processing", code: "campaign_processing" }),
    );

    const apiCall = createApiClient({ apiKey: "test", baseUrl: "https://test.api.com" });

    await expect(apiCall("/reports/details", { campaign_id: "999" })).rejects.toThrow("Campaign is still processing");
  });
});
