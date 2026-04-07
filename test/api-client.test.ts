import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApiClient } from "../src/api-client.js";
import { AuthError, ValidationError, RateLimitError, NetworkError, TimeoutError } from "../src/errors.js";
import { mockFetch } from "./setup.js";

function jsonResponse(body: object, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

describe("createApiClient", () => {
  const apiCall = createApiClient({ apiKey: "test-key", baseUrl: "https://test.api.com", timeout: 5000 });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends POST with apikey header and returns parsed body", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true, credit: 100 }));

    const result = await apiCall<{ credit: number }>("/credits/consult", { foo: "bar" });

    expect(result.credit).toBe(100);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://test.api.com/credits/consult",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ apikey: "test-key" }),
        body: JSON.stringify({ foo: "bar" }),
      }),
    );
  });

  it("throws AuthError on HTTP 401", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: false }, 401));

    await expect(apiCall("/credits/consult")).rejects.toThrow(AuthError);
  });

  it("throws AuthError on success:false with code auth_01", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ success: false, message: "Unauthorized", code: "auth_01" }),
    );

    await expect(apiCall("/credits/consult")).rejects.toThrow(AuthError);
  });

  it("throws ValidationError on success:false with API message", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ success: false, message: "Número inválido", code: "sms_12" }),
    );

    const error = await apiCall("/sms/send").catch((e) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toBe("Número inválido");
    expect(error.code).toBe("sms_12");
  });

  it("retries once on HTTP 429 then throws RateLimitError", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({}, 429, { "Retry-After": "0" }))
      .mockResolvedValueOnce(jsonResponse({}, 429, { "Retry-After": "0" }));

    await expect(apiCall("/credits/consult")).rejects.toThrow(RateLimitError);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("succeeds on retry after 429", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({}, 429, { "Retry-After": "0" }))
      .mockResolvedValueOnce(jsonResponse({ success: true, credit: 50 }));

    const result = await apiCall<{ credit: number }>("/credits/consult");
    expect(result.credit).toBe(50);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("throws NetworkError on fetch failure", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("fetch failed"));

    await expect(apiCall("/credits/consult")).rejects.toThrow(NetworkError);
  });

  it("throws NetworkError on malformed JSON", async () => {
    mockFetch.mockResolvedValueOnce(new Response("not json", { status: 200 }));

    const error = await apiCall("/credits/consult").catch((e) => e);
    expect(error).toBeInstanceOf(NetworkError);
    expect(error.message).toContain("JSON malformado");
  });

  it("throws TimeoutError on abort after retry", async () => {
    const apiCallShort = createApiClient({ apiKey: "test-key", baseUrl: "https://test.api.com", timeout: 1 });

    mockFetch.mockImplementation(
      () => new Promise((_, reject) => setTimeout(() => reject(new DOMException("Aborted", "AbortError")), 10)),
    );

    await expect(apiCallShort("/credits/consult")).rejects.toThrow(TimeoutError);
  });
});
