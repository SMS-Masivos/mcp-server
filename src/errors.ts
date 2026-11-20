export class SmsmasivosError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode: number = 200) {
    super(message);
    this.name = "SmsmasivosError";
    this.code = code;
    this.statusCode = statusCode;
  }

  static fromApiResponse(body: {
    success: boolean;
    message?: string;
    code?: string;
    status?: number;
  }): SmsmasivosError {
    const message = body.message ?? "Unknown API error";
    const code = body.code ?? "unknown";

    if (code === "auth_01" || body.status === 401) {
      return new AuthError(message);
    }
    if (code === "sms_06") {
      return new InsufficientCreditsError(message);
    }
    return new ValidationError(message, code);
  }
}

export class AuthError extends SmsmasivosError {
  constructor(message: string = "API key inválida o expirada") {
    super(message, "auth_01", 401);
    this.name = "AuthError";
  }
}

export class InsufficientCreditsError extends SmsmasivosError {
  constructor(message: string = "Créditos insuficientes") {
    super(message, "sms_06", 402);
    this.name = "InsufficientCreditsError";
  }
}

export class ValidationError extends SmsmasivosError {
  constructor(message: string, code: string = "validation") {
    super(message, code);
    this.name = "ValidationError";
  }
}

export class RateLimitError extends SmsmasivosError {
  retryAfter?: number;

  constructor(retryAfter?: number) {
    super(
      "Rate limit excedido. " +
        (retryAfter ? `Intenta de nuevo en ${retryAfter} s.` : "Intenta de nuevo en unos segundos."),
      "rate_limit",
      429,
    );
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

/**
 * 429 del Worker de la API con `code: "rate_limit_daily"`: la cuenta agotó su cupo diario de
 * `/campaigns` o `/reports/details`. No se reintenta ni se espera: el cupo vuelve a medianoche CDMX.
 */
export class DailyRateLimitError extends RateLimitError {
  limit?: number;

  constructor(retryAfter?: number, limit?: number) {
    super(retryAfter);
    this.name = "DailyRateLimitError";
    this.code = "rate_limit_daily";
    this.limit = limit;
    this.message =
      "Límite diario alcanzado" +
      (limit ? ` (${limit} consultas por día a este endpoint)` : "") +
      ". NO reintentes: el cupo se reinicia a medianoche, hora de la Ciudad de México" +
      (retryAfter ? ` (en unos ${Math.ceil(retryAfter / 3600)} h)` : "") +
      ". Para recibir el estado de los envíos en tiempo real configura el webhook de reportes en la cuenta.";
  }
}

export class NetworkError extends SmsmasivosError {
  constructor(message: string = "Error de conexión con la API") {
    super(message, "network_error", 0);
    this.name = "NetworkError";
  }
}

export class TimeoutError extends NetworkError {
  constructor(message: string = "La solicitud excedió el tiempo de espera") {
    super(message);
    this.name = "TimeoutError";
    this.code = "timeout";
  }
}
