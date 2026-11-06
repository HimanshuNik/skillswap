/**
 * Lightweight in-memory telemetry and metrics tracker for SkillSwap.
 * Tracks request latencies, throughput, error rates, and system resources
 * without external dependencies or overhead.
 */

interface LatencyMetrics {
  averageMs: number;
  p95Ms: number;
  minMs: number;
  maxMs: number;
}

export class TelemetryTracker {
  private startTime: number = Date.now();
  private totalRequests: number = 0;
  private failedRequests: number = 0;
  private latencySamples: number[] = [];
  private readonly maxSamples: number = 200;

  /**
   * Records an incoming HTTP request completion.
   */
  recordRequest(durationMs: number, statusCode: number): void {
    this.totalRequests++;
    if (statusCode >= 400) {
      this.failedRequests++;
    }

    // Keep circular buffer of recent latency samples
    if (this.latencySamples.length >= this.maxSamples) {
      this.latencySamples.shift();
    }
    this.latencySamples.push(durationMs);
  }

  /**
   * Computes latency statistics across recent samples.
   */
  getLatencyMetrics(): LatencyMetrics {
    if (this.latencySamples.length === 0) {
      return { averageMs: 0, p95Ms: 0, minMs: 0, maxMs: 0 };
    }

    const sorted = [...this.latencySamples].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const averageMs = Math.round(sum / sorted.length);
    const p95Index = Math.min(Math.floor(sorted.length * 0.95), sorted.length - 1);
    const p95Ms = sorted[p95Index] || 0;
    const minMs = sorted[0] || 0;
    const maxMs = sorted[sorted.length - 1] || 0;

    return { averageMs, p95Ms, minMs, maxMs };
  }

  /**
   * Retrieves overall telemetry summary.
   */
  getSummary() {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const errorRatePercent =
      this.totalRequests > 0
        ? Number(((this.failedRequests / this.totalRequests) * 100).toFixed(2))
        : 0;

    const memory = process.memoryUsage();
    const cpu = process.cpuUsage();

    return {
      uptimeSeconds,
      totalRequests: this.totalRequests,
      failedRequests: this.failedRequests,
      errorRatePercent,
      latency: this.getLatencyMetrics(),
      memory: {
        rssMb: Math.round(memory.rss / (1024 * 1024)),
        heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
        heapTotalMb: Math.round(memory.heapTotal / (1024 * 1024)),
        heapUtilizationPercent: Math.round((memory.heapUsed / memory.heapTotal) * 100),
      },
      cpu: {
        userMicroseconds: cpu.user,
        systemMicroseconds: cpu.system,
      },
    };
  }

  /**
   * Resets metrics (used in test suites).
   */
  reset(): void {
    this.totalRequests = 0;
    this.failedRequests = 0;
    this.latencySamples = [];
    this.startTime = Date.now();
  }
}

export const telemetry = new TelemetryTracker();

