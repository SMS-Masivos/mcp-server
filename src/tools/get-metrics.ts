import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { metrics } from "../metrics.js";

export function registerGetMetrics(server: McpServer) {
  server.tool(
    "get_metrics",
    "Muestra las métricas de uso del MCP en la sesión actual: llamadas por tool, errores, latencia promedio y p95, uso sandbox vs producción.",
    {},
    async () => {
      const snapshot = metrics.getSnapshot();
      const lines: string[] = [];

      lines.push(`Uptime: ${snapshot.uptimeSeconds}s`);
      lines.push(`Llamadas: ${snapshot.productionCalls} producción, ${snapshot.sandboxCalls} sandbox`);

      if (Object.keys(snapshot.toolCalls).length > 0) {
        lines.push("\nLlamadas por tool:");
        for (const [tool, count] of Object.entries(snapshot.toolCalls)) {
          const avg = snapshot.avgLatency[tool] ?? 0;
          const p95 = snapshot.p95Latency[tool] ?? 0;
          lines.push(`  ${tool}: ${count} llamadas (avg ${avg}ms, p95 ${p95}ms)`);
        }
      }

      if (Object.keys(snapshot.errorCounts).length > 0) {
        lines.push("\nErrores:");
        for (const [key, count] of Object.entries(snapshot.errorCounts)) {
          lines.push(`  ${key}: ${count}`);
        }
      }

      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    },
  );
}
