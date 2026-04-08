const MAX_LATENCIES = 1000;

export interface MetricsSnapshot {
  toolCalls: Record<string, number>;
  errorCounts: Record<string, number>;
  avgLatency: Record<string, number>;
  p95Latency: Record<string, number>;
  sandboxCalls: number;
  productionCalls: number;
  uptimeSeconds: number;
}

export class MetricsCollector {
  private toolCalls = new Map<string, number>();
  private errorCounts = new Map<string, number>();
  private latencies = new Map<string, number[]>();
  private sandboxCalls = 0;
  private productionCalls = 0;
  private startTime = Date.now();

  recordCall(toolName: string, latencyMs: number, isSandbox: boolean): void {
    this.toolCalls.set(toolName, (this.toolCalls.get(toolName) ?? 0) + 1);

    const arr = this.latencies.get(toolName) ?? [];
    arr.push(latencyMs);
    if (arr.length > MAX_LATENCIES) arr.shift();
    this.latencies.set(toolName, arr);

    if (isSandbox) this.sandboxCalls++;
    else this.productionCalls++;
  }

  recordError(toolName: string, errorType: string): void {
    const key = `${toolName}:${errorType}`;
    this.errorCounts.set(key, (this.errorCounts.get(key) ?? 0) + 1);
  }

  getSnapshot(): MetricsSnapshot {
    const avgLatency: Record<string, number> = {};
    const p95Latency: Record<string, number> = {};

    for (const [tool, arr] of this.latencies) {
      if (arr.length === 0) continue;
      avgLatency[tool] = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
      const sorted = [...arr].sort((a, b) => a - b);
      p95Latency[tool] = sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1];
    }

    return {
      toolCalls: Object.fromEntries(this.toolCalls),
      errorCounts: Object.fromEntries(this.errorCounts),
      avgLatency,
      p95Latency,
      sandboxCalls: this.sandboxCalls,
      productionCalls: this.productionCalls,
      uptimeSeconds: Math.round((Date.now() - this.startTime) / 1000),
    };
  }

  reset(): void {
    this.toolCalls.clear();
    this.errorCounts.clear();
    this.latencies.clear();
    this.sandboxCalls = 0;
    this.productionCalls = 0;
    this.startTime = Date.now();
  }
}

export const metrics = new MetricsCollector();
