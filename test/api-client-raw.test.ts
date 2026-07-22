import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockFetch } from "./setup.js";
import { createApiClient, type RawResponse } from "../src/api-client.js";

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Modo status-aware (raw) — contrato de los endpoints v2 (OTP). El HTTP status ES la señal:
// el cliente NO debe mapear 401→AuthError, NO debe reintentar en 429, NI lanzar en success:false.
describe("api-client raw mode (v2 status-aware)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve { status, body } en 201 (send creó el código)", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ success: true, state: "pending", action: "created" }, 201),
    );
    const apiCall = createApiClient({ apiKey: "test" });
    const res = await apiCall<RawResponse>("/v2/otp", { phone_number: "5512345678", country_code: "52", company: "X" }, { raw: true });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ success: true, action: "created" });
  });

  it("NO lanza en 401 (verify: código incorrecto) — lo devuelve como body", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ success: false, error: "otp_incorrect_code", attempts_remaining: 3 }, 401),
    );
    const apiCall = createApiClient({ apiKey: "test" });
    const res = await apiCall<RawResponse>("/v2/otp/verify", { phone_number: "5512345678", country_code: "52", code: "000000" }, { raw: true });

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: "otp_incorrect_code", attempts_remaining: 3 });
  });

  it("NO reintenta en 429 (throttle/locked) — una sola llamada a fetch", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ success: false, error: "otp_throttled", resend_available_in: 18 }, 429),
    );
    const apiCall = createApiClient({ apiKey: "test" });
    const res = await apiCall<RawResponse>("/v2/otp", { phone_number: "5512345678", country_code: "52", company: "X" }, { raw: true });

    expect(res.status).toBe(429);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("DELETE manda el body con los parámetros", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true, state: "none", action: "deleted" }, 200));
    const apiCall = createApiClient({ apiKey: "test" });
    await apiCall<RawResponse>("/v2/otp", { phone_number: "5512345678", country_code: "52" }, { method: "DELETE", raw: true });

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.smsmasivos.com.mx/v2/otp");
    expect(init.method).toBe("DELETE");
    expect(JSON.parse(init.body as string)).toMatchObject({ source: "mcp", phone_number: "5512345678", country_code: "52" });
  });

  it("GET status arma el query string y no manda body", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true, state: "pending" }, 200));
    const apiCall = createApiClient({ apiKey: "test" });
    await apiCall<RawResponse>("/v2/otp/status", { phone_number: "5512345678", country_code: "52" }, { method: "GET", raw: true });

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("/v2/otp/status?");
    expect(url).toContain("phone_number=5512345678");
    expect(url).toContain("country_code=52");
    expect(init.body).toBeUndefined();
  });

  it("regresión: sin raw, un 401 sí lanza AuthError (comportamiento v1 intacto)", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: false }, 401));
    const apiCall = createApiClient({ apiKey: "bad" });

    await expect(apiCall("/credits/consult")).rejects.toThrow("API key inválida");
  });
});
