import { healthRepository, type DatabaseHealthStatus } from '../repositories/health.repository.js';
import { env } from '../config/env.js';
import { telemetry } from '../utils/telemetry.js';
import { getSocketMetrics } from '../socket/index.js';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded';
  message: string;
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  database: DatabaseHealthStatus;
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
    heapUtilizationPercent: number;
  };
  cpu: {
    userMicroseconds: number;
    systemMicroseconds: number;
  };
  sockets: {
    activeConnections: number;
    onlineUsers: number;
  };
  telemetry: {
    totalRequests: number;
    failedRequests: number;
    errorRatePercent: number;
    averageLatencyMs: number;
    p95LatencyMs: number;
  };
}

export interface LivenessResult {
  status: 'ok';
  timestamp: string;
  uptimeSeconds: number;
}

export interface ReadinessResult {
  status: 'ready' | 'unready';
  timestamp: string;
  database: DatabaseHealthStatus;
}

export class HealthService {
  /**
   * Comprehensive health check reporting database, memory, CPU, socket, and telemetry metrics.
   */
  async getHealthStatus(): Promise<HealthCheckResult> {
    const dbStatus = await healthRepository.checkDatabase();
    const summary = telemetry.getSummary();

    let socketStats = { activeConnections: 0, onlineUsers: 0 };
    try {
      const metrics = getSocketMetrics();
      socketStats = {
        activeConnections: metrics.activeSockets,
        onlineUsers: metrics.onlineUsersCount,
      };
    } catch {
      // Socket server may not be initialized in isolated unit tests
    }

    const isHealthy = dbStatus.connected;

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      message: isHealthy
        ? 'SkillSwap API is healthy and operational'
        : 'SkillSwap API database connection is degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: summary.uptimeSeconds,
      environment: env.NODE_ENV,
      database: dbStatus,
      memory: summary.memory,
      cpu: summary.cpu,
      sockets: socketStats,
      telemetry: {
        totalRequests: summary.totalRequests,
        failedRequests: summary.failedRequests,
        errorRatePercent: summary.errorRatePercent,
        averageLatencyMs: summary.latency.averageMs,
        p95LatencyMs: summary.latency.p95Ms,
      },
    };
  }

  /**
   * Lightweight liveness probe for process orchestrators (Docker, Render, Kubernetes).
   * Verifies the Node.js event loop is alive.
   */
  getLiveness(): LivenessResult {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }

  /**
   * Readiness probe verifying that database connectivity is established and ready to accept traffic.
   */
  async getReadiness(): Promise<ReadinessResult> {
    const dbStatus = await healthRepository.checkDatabase();
    return {
      status: dbStatus.connected ? 'ready' : 'unready',
      timestamp: new Date().toISOString(),
      database: dbStatus,
    };
  }
}

export const healthService = new HealthService();
