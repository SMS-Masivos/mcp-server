import {
  SmsmasivosError,
  AuthError,
  RateLimitError,
  NetworkError,
  TimeoutError,
} from "./errors.js";

const DEFAULT_BASE_URL = "https://api.smsmasivos.com.mx";
const DEFAULT_TIMEOUT = 30_000;

export interface ApiClientConfig {
  apiKey: string;
  baseUrl?: string;
  cfAccessClientId?: string;
  cfAccessClientSecret?: string;
  timeout?: number;
}

export type ApiCall = <T>(endpoint: string, params?: Record<string, unknown>) => Promise<T>;

export function createApiClient(config: ApiClientConfig): ApiCall {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const timeout = config.timeout ?? DEFAULT_TIMEOUT;

  async function apiCall<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    return executeWithRetry<T>(baseUrl, endpoint, config.apiKey, timeout, params, config.cfAccessClientId, config.cfAccessClientSecret);
  }

  return apiCall;
}

async function executeWithRetry<T>(
  baseUrl: string,
  endpoint: string,
  apiKey: string,
  timeout: number,
  params?: Record<string, unknown>,
  cfAccessClientId?: string,
  cfAccessClientSecret?: string,
  attempt: number = 1,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: apiKey,
    };
    if (cfAccessClientId && cfAccessClientSecret) {
      headers["CF-Access-Client-Id"] = cfAccessClientId;
      headers["CF-Access-Client-Secret"] = cfAccessClientSecret;
    }

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ source: "mcp", ...params }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (response.status === 401) {
      throw new AuthError();
    }

    if (response.status === 429) {
      if (attempt < 2) {
        const retryAfter = parseInt(response.headers.get("Retry-After") ?? "2", 10);
        await sleep(retryAfter * 1000);
        return executeWithRetry<T>(baseUrl, endpoint, apiKey, timeout, params, cfAccessClientId, cfAccessClientSecret, attempt + 1);
      }
      throw new RateLimitError();
    }

    let body: Record<string, unknown>;
    try {
      body = (await response.json()) as Record<string, unknown>;
    } catch {
      throw new NetworkError("Respuesta inválida de la API (JSON malformado)");
    }

    if (body.success === false) {
      throw SmsmasivosError.fromApiResponse(
        body as { success: boolean; message?: string; code?: string; status?: number },
      );
    }

    return body as T;
  } catch (error) {
    clearTimeout(timer);

    if (error instanceof SmsmasivosError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      if (attempt < 2) {
        return executeWithRetry<T>(baseUrl, endpoint, apiKey, timeout, params, cfAccessClientId, cfAccessClientSecret, attempt + 1);
      }
      throw new TimeoutError();
    }

    if (error instanceof TypeError) {
      throw new NetworkError(error.message);
    }

    throw new NetworkError(String(error));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
