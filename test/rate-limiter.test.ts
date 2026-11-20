import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRateLimiter, parseMaxCallsPerMinute } from "../src/rate-limiter.js";
import { createApiClient, DEFAULT_MAX_CALLS_PER_MINUTE } from "../src/api-client.js";
import { RateLimitError } from "../src/errors.js";
import { mockFetch } from "./setup.js";

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("createRateLimiter", () => {
  it("allows calls up to the limit and then reports the wait in whole seconds", () => {
    let t = 1_000_000;
    const limiter = createRateLimiter(3, () => t);

    expect(limiter.tryAcquire()).toBeNull();
    t += 10_000;
    expect(limiter.tryAcquire()).toBeNull();
    t += 10_000;
    expect(limiter.tryAcquire()).toBeNull();
    t += 5_000; // 25 s since the first call
    expect(limiter.tryAcquire()).toBe(35);
  });

  it("frees a slot once the oldest call leaves the 60 s window", () => {
    let t = 0;
    const limiter = createRateLimiter(2, () => t);
    expect(limiter.tryAcquire()).toBeNull();
    t += 30_000;
    expect(limiter.tryAcquire()).toBeNull();
    expect(limiter.tryAcquire()).toBe(30);

    t += 30_000; // first call is now exactly 60 s old
    expect(limiter.tryAcquire()).toBeNull();
    expect(limiter.tryAcquire()).toBe(30);
  });

  it("never reports less than 1 second", () => {
    let t = 0;
    const limiter = createRateLimiter(1, () => t);
    limiter.tryAcquire();
    t += 59_999;
    expect(limiter.tryAcquire()).toBe(1);
  });

  it.each([0, -5, Number.NaN, Number.POSITIVE_INFINITY])("treats %s as disabled", (limit) => {
    const limiter = createRateLimiter(limit);
    expect(limiter.limit).toBe(0);
    for (let i = 0; i < 1000; i++) expect(limiter.tryAcquire()).toBeNull();
  });
});

describe("parseMaxCallsPerMinute", () => {
  it("returns undefined when unset or blank", () => {
    expect(parseMaxCallsPerMinute(undefined)).toBeUndefined();
    expect(parseMaxCallsPerMinute("  ")).toBeUndefined();
  });

  it("parses non-negative integers, including 0", () => {
    expect(parseMaxCallsPerMinute("60")).toBe(60);
    expect(parseMaxCallsPerMinute("0")).toBe(0);
  });

  it.each(["abc", "-1", "1.5"])("rejects %s", (value) => {
    expect(() => parseMaxCallsPerMinute(value)).toThrow(/SMSMASIVOS_MAX_CALLS_PER_MINUTE/);
  });
});

describe("createApiClient local rate limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockImplementation(async () => jsonResponse({ success: true }));
  });

  it("blocks calls over the limit without sending the request", async () => {
    const apiCall = createApiClient({ apiKey: "k", maxCallsPerMinute: 2 });

    await apiCall("/sms/send", { n: 1 });
    await apiCall("/sms/send", { n: 2 });
    const error = await apiCall("/sms/send", { n: 3 }).catch((e) => e);

    expect(error).toBeInstanceOf(RateLimitError);
    expect(error.retryAfter).toBeGreaterThanOrEqual(1);
    expect(error.message).toContain("2 llamadas por minuto");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("also counts status-aware (raw) calls", async () => {
    const apiCall = createApiClient({ apiKey: "k", maxCallsPerMinute: 1 });

    await apiCall("/v2/otp", {}, { raw: true });
    await expect(apiCall("/v2/otp", {}, { raw: true })).rejects.toThrow(RateLimitError);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("does not spend extra quota on the internal 429 retry", async () => {
    const apiCall = createApiClient({ apiKey: "k", maxCallsPerMinute: 1 });
    mockFetch
      .mockResolvedValueOnce(
        new Response("{}", { status: 429, headers: { "Retry-After": "0" } }),
      )
      .mockResolvedValueOnce(jsonResponse({ success: true, credit: 1 }));

    await expect(apiCall("/credits/consult")).resolves.toMatchObject({ credit: 1 });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("limits each client independently", async () => {
    const a = createApiClient({ apiKey: "a", maxCallsPerMinute: 1 });
    const b = createApiClient({ apiKey: "b", maxCallsPerMinute: 1 });

    await a("/credits/consult");
    await b("/credits/consult");
    await expect(a("/credits/consult")).rejects.toThrow(RateLimitError);
  });

  it("is disabled with maxCallsPerMinute: 0", async () => {
    const apiCall = createApiClient({ apiKey: "k", maxCallsPerMinute: 0 });
    for (let i = 0; i < DEFAULT_MAX_CALLS_PER_MINUTE + 5; i++) await apiCall("/credits/consult");
    expect(mockFetch).toHaveBeenCalledTimes(DEFAULT_MAX_CALLS_PER_MINUTE + 5);
  });

  it("applies the default cap when none is configured", async () => {
    const apiCall = createApiClient({ apiKey: "k" });
    for (let i = 0; i < DEFAULT_MAX_CALLS_PER_MINUTE; i++) await apiCall("/credits/consult");
    await expect(apiCall("/credits/consult")).rejects.toThrow(RateLimitError);
    expect(mockFetch).toHaveBeenCalledTimes(DEFAULT_MAX_CALLS_PER_MINUTE);
  });
});
