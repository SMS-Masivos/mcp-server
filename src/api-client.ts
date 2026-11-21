import {
  SmsmasivosError,
  AuthError,
  RateLimitError,
  DailyRateLimitError,
  NetworkError,
  TimeoutError,
} from "./errors.js";
import { USER_AGENT } from "./version.js";

const DEFAULT_BASE_URL = "https://api.smsmasivos.com.mx";
const DEFAULT_TIMEOUT = 30_000;
// Un 429 que pide esperar más que esto no se duerme: se devuelve el error con su Retry-After.
const MAX_RETRY_WAIT_SECONDS = 10;

export interface ApiClientConfig {
  apiKey: string;
  baseUrl?: string;
  cfAccessClientId?: string;
  cfAccessClientSecret?: string;
  timeout?: number;
}

export interface ApiCallOptions {
  timeout?: number;
  method?: "GET" | "POST" | "DELETE";
  /**
   * Modo status-aware: en vez de mapear 401→AuthError / reintentar en 429 / lanzar en
   * `success:false`, devuelve `{ status, body }` crudo y deja que el caller ramifique sobre
   * el HTTP code. Requerido por los endpoints v2 (p. ej. OTP) cuyo contrato ES el status
   * (401 = código incorrecto, 402 = saldo, 404/409/410/429 = estados de la verificación).
   * Los errores de red/timeout SÍ se siguen lanzando (el retry de timeout es solo para GET).
   */
  raw?: boolean;
}

export interface RawResponse {
  status: number;
  body: Record<string, unknown>;
}

export type ApiCall = <T>(
  endpoint: string,
  params?: Record<string, unknown>,
  opts?: ApiCallOptions,
) => Promise<T>;

export function createApiClient(config: ApiClientConfig): ApiCall {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const defaultTimeout = config.timeout ?? DEFAULT_TIMEOUT;

  async function apiCall<T>(
    endpoint: string,
    params?: Record<string, unknown>,
    opts?: ApiCallOptions,
  ): Promise<T> {
    const timeout = opts?.timeout ?? defaultTimeout;
    const method = opts?.method ?? "POST";
    const raw = opts?.raw ?? false;
    return executeWithRetry<T>(
      baseUrl,
      endpoint,
      config.apiKey,
      timeout,
      method,
      raw,
      params,
      config.cfAccessClientId,
      config.cfAccessClientSecret,
    );
  }

  return apiCall;
}

async function executeWithRetry<T>(
  baseUrl: string,
  endpoint: string,
  apiKey: string,
  timeout: number,
  method: "GET" | "POST" | "DELETE",
  raw: boolean,
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
      "User-Agent": USER_AGENT,
      apikey: apiKey,
    };
    if (cfAccessClientId && cfAccessClientSecret) {
      headers["CF-Access-Client-Id"] = cfAccessClientId;
      headers["CF-Access-Client-Secret"] = cfAccessClientSecret;
    }

    const url = method === "GET"
      ? `${baseUrl}${endpoint}${buildQueryString({ source: "mcp", ...params })}`
      : `${baseUrl}${endpoint}`;

    const init: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    };
    if (method !== "GET") {
      init.body = JSON.stringify({ source: "mcp", ...params });
    }

    const response = await fetch(url, init);

    clearTimeout(timer);

    // Modo status-aware (v2): NO interceptar 401/429 ni lanzar en success:false.
    // El caller ramifica sobre el HTTP code. Solo se parsea el body y se devuelve crudo.
    if (raw) {
      let rawBody: Record<string, unknown>;
      try {
        rawBody = (await response.json()) as Record<string, unknown>;
      } catch {
        throw new NetworkError("Respuesta inválida de la API (JSON malformado)");
      }
      return { status: response.status, body: rawBody } as T;
    }

    if (response.status === 401) {
      throw new AuthError();
    }

    if (response.status === 429) {
      const retryAfterHeader = parseInt(response.headers.get("Retry-After") ?? "", 10);
      const retryAfter = Number.isNaN(retryAfterHeader) ? undefined : retryAfterHeader;
      let rateBody: { code?: unknown; limit?: unknown } | null = null;
      try {
        rateBody = (await response.json()) as { code?: unknown; limit?: unknown };
      } catch {
        rateBody = null;
      }
      // Cupo diario del Worker: no se duerme el Retry-After (llega a horas) ni se reintenta.
      if (rateBody?.code === "rate_limit_daily") {
        throw new DailyRateLimitError(
          retryAfter,
          typeof rateBody.limit === "number" ? rateBody.limit : undefined,
        );
      }
      const wait = retryAfter ?? 2;
      if (attempt < 2 && wait <= MAX_RETRY_WAIT_SECONDS) {
        await sleep(wait * 1000);
        return executeWithRetry<T>(
          baseUrl,
          endpoint,
          apiKey,
          timeout,
          method,
          raw,
          params,
          cfAccessClientId,
          cfAccessClientSecret,
          attempt + 1,
        );
      }
      throw new RateLimitError(retryAfter);
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
      // Solo GET: un POST/DELETE cortado por tiempo pudo llegar a la API (cobrar, enviar). ⇒ api#366
      if (method === "GET" && attempt < 2) {
        return executeWithRetry<T>(
          baseUrl,
          endpoint,
          apiKey,
          timeout,
          method,
          raw,
          params,
          cfAccessClientId,
          cfAccessClientSecret,
          attempt + 1,
        );
      }
      throw new TimeoutError();
    }

    if (error instanceof TypeError) {
      throw new NetworkError(error.message);
    }

    throw new NetworkError(String(error));
  }
}

function buildQueryString(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    search.append(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
