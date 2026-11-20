import { readFileSync } from "node:fs";

// Versión del paquete publicado: se lee de package.json (src/ y dist/ cuelgan de la misma raíz).
function readVersion(): string {
  try {
    const raw = readFileSync(new URL("../package.json", import.meta.url), "utf8");
    return (JSON.parse(raw) as { version?: string }).version ?? "unknown";
  } catch {
    return "unknown";
  }
}

export const USER_AGENT = `smsmasivos-mcp/${readVersion()}`;
