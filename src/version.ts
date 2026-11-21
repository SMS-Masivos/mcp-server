// Debe coincidir con "version" de package.json: test/rate-limit-diario.test.ts lo comprueba.
// No se lee con node:fs: en el worker de Cloudflare no existe y salía "unknown" ⇒ #11644.
export const VERSION = "2.2.0";

export const USER_AGENT = `smsmasivos-mcp/${VERSION}`;
