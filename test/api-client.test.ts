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
  const apiCall = createApiClient({ apiKey: "test-key", timeout: 5000 });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends POST with apikey header and returns parsed body", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true, credit: 100 }));

    const result = await apiCall<{ credit: number }>("/credits/consult", { foo: "bar" });

    expect(result.credit).toBe(100);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.smsmasivos.com.mx/credits/consult",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ apikey: "test-key" }),
        body: JSON.stringify({ source: "mcp", foo: "bar" }),
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
    const apiCallShort = createApiClient({ apiKey: "test-key", timeout: 1 });

    mockFetch.mockImplementation(
      () => new Promise((_, reject) => setTimeout(() => reject(new DOMException("Aborted", "AbortError")), 10)),
    );

    await expect(apiCallShort("/credits/consult")).rejects.toThrow(TimeoutError);
  });
});

describe("apiCall GET method", () => {
  const apiCall = createApiClient({ apiKey: "test-key", timeout: 5000 });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses GET with querystring when method='GET'", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true, agendas: [] }));

    await apiCall("/contactlist/find", { name: "Clientes VIP" }, { method: "GET" });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/contactlist/find?"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("preserves source=mcp as query param in GET (critical for type_method=43 tracking)", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true, agendas: [] }));

    await apiCall("/contactlist/find", { name: "Test" }, { method: "GET" });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("source=mcp");
    expect(calledUrl).toContain("name=Test");
  });

  it("does not send a body on GET", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }));

    await apiCall("/contactlist/find", { foo: "bar" }, { method: "GET" });

    const init = mockFetch.mock.calls[0][1] as RequestInit;
    expect(init.body).toBeUndefined();
  });

  it("encodes special characters in query string", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }));

    await apiCall("/contactlist/find", { name: "Cli&entes VIP" }, { method: "GET" });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("name=Cli%26entes+VIP");
  });

  it("skips undefined and null params in querystring", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }));

    await apiCall(
      "/contactlist/find",
      { name: "Test", optional: undefined, missing: null },
      { method: "GET" },
    );

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain("optional");
    expect(calledUrl).not.toContain("missing");
    expect(calledUrl).toContain("name=Test");
  });

  it("defaults to POST when no method opt is passed (regression)", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }));

    await apiCall("/credits/consult", { foo: "bar" });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.smsmasivos.com.mx/credits/consult",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ source: "mcp", foo: "bar" }),
      }),
    );
  });
});

describe("apiCall timeout override", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("respects per-call timeout override (uses opts.timeout, not config.timeout)", async () => {
    const apiCall = createApiClient({ apiKey: "test-key", timeout: 30_000 });
    let abortFiredAt = 0;

    mockFetch.mockImplementation((_url, init) => {
      const start = Date.now();
      return new Promise((_, reject) => {
        const signal = (init as RequestInit).signal as AbortSignal;
        signal.addEventListener("abort", () => {
          abortFiredAt = Date.now() - start;
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });

    const promise = apiCall("/reports/generate", {}, { timeout: 50 });

    await expect(promise).rejects.toThrow(TimeoutError);
    expect(abortFiredAt).toBeGreaterThanOrEqual(50);
    expect(abortFiredAt).toBeLessThan(500);
  });

  it("falls back to config timeout when opts.timeout not provided", async () => {
    const apiCall = createApiClient({ apiKey: "test-key", timeout: 50 });

    mockFetch.mockImplementation(
      (_url, init) =>
        new Promise((_, reject) => {
          const signal = (init as RequestInit).signal as AbortSignal;
          signal.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );

    await expect(apiCall("/credits/consult")).rejects.toThrow(TimeoutError);
  });
});
