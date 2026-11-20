export interface RateLimiter {
  /** Máximo de llamadas por ventana; 0 = sin límite. */
  readonly limit: number;
  /**
   * Intenta consumir un cupo. Devuelve `null` si la llamada puede salir, o los segundos
   * (enteros, mínimo 1) que faltan para que se libere un cupo.
   */
  tryAcquire(): number | null;
}

const WINDOW_MS = 60_000;

/**
 * Ventana deslizante en memoria: guarda las marcas de tiempo de las llamadas de los últimos 60 s.
 * `limit <= 0` (o no finito) desactiva el límite.
 */
export function createRateLimiter(limit: number, now: () => number = Date.now): RateLimiter {
  const max = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 0;
  const calls: number[] = [];

  return {
    limit: max,
    tryAcquire() {
      if (max === 0) return null;
      const t = now();
      while (calls.length > 0 && t - calls[0] >= WINDOW_MS) calls.shift();
      if (calls.length >= max) {
        return Math.max(1, Math.ceil((calls[0] + WINDOW_MS - t) / 1000));
      }
      calls.push(t);
      return null;
    },
  };
}

/**
 * Lee el tope de `SMSMASIVOS_MAX_CALLS_PER_MINUTE`. Sin definir (o vacío) devuelve `undefined`
 * (se usa el valor por defecto); un valor no numérico o negativo es un error de configuración.
 */
export function parseMaxCallsPerMinute(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(
      `SMSMASIVOS_MAX_CALLS_PER_MINUTE debe ser un entero >= 0 (0 desactiva el límite); recibido "${value}".`,
    );
  }
  return n;
}
