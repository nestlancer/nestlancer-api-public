import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PerformanceMetrics, SystemAlert } from '../interfaces/dashboard.interface';

@Injectable()
export class DashboardPerformanceService {
  constructor(private readonly httpService: HttpService) {}

  /**
   * Builds system alerts from current performance and health.
   * Production can extend this with webhook DLQ, queue depth, etc.
   */
  async getAlerts(): Promise<SystemAlert[]> {
    const alerts: SystemAlert[] = [];
    const perf = await this.getPerformance();
    const now = new Date().toISOString();

    if (perf.errorRate > 1) {
      alerts.push({
        id: `alert-error-rate-${Date.now()}`,
        type: 'critical',
        title: 'Elevated error rate',
        message: `Current error rate is ${perf.errorRate}%. Check logs and dependencies.`,
        timestamp: now,
      });
    } else if (perf.errorRate > 0.5) {
      alerts.push({
        id: `alert-error-rate-${Date.now()}`,
        type: 'warning',
        title: 'Higher than usual error rate',
        message: `Error rate at ${perf.errorRate}%. Monitor for degradation.`,
        timestamp: now,
      });
    }

    if (perf.memoryUsage > 1024 * 1024 * 900) {
      // ~900MB
      alerts.push({
        id: `alert-memory-${Date.now()}`,
        type: 'warning',
        title: 'High memory usage',
        message: `Process memory usage is elevated. Consider scaling or profiling.`,
        timestamp: now,
      });
    }

    if (perf.uptime < 99.9) {
      alerts.push({
        id: `alert-uptime-${Date.now()}`,
        type: 'info',
        title: 'Uptime below target',
        message: `Current uptime: ${perf.uptime}%. Target is 99.9%.`,
        timestamp: now,
      });
    }

    return alerts;
  }

  async getPerformance(): Promise<PerformanceMetrics> {
    const promUrl = process.env.PROMETHEUS_URL || 'http://prometheus:9090';
    /** Must stay well under the gateway proxy timeout (admin service is often 5s) so we fail fast when Prometheus is unreachable. */
    const promTimeoutMs = Math.min(
      Math.max(parseInt(process.env.PROMETHEUS_QUERY_TIMEOUT_MS || '2000', 10) || 2000, 400),
      7500,
    );
    try {
      let memUsage = 45.2;
      const memRes = await this.httpService.axiosRef.get(
        `${promUrl}/api/v1/query?query=process_resident_memory_bytes`,
        { timeout: promTimeoutMs, validateStatus: () => true },
      );
      const ok = memRes.status == null || (memRes.status >= 200 && memRes.status < 300);
      if (ok && memRes.data?.data?.result?.[0]?.value?.[1]) {
        memUsage = parseFloat(memRes.data.data.result[0].value[1]) / (1024 * 1024);
      }

      return {
        responseTime: { p50: 45, p95: 120, p99: 250 },
        errorRate: 0.15,
        uptime: 99.99,
        memoryUsage: memUsage,
        cpuUsage: 12.5,
      };
    } catch (e: any) {
      return {
        responseTime: { p50: 45, p95: 120, p99: 250 },
        errorRate: 0.15,
        uptime: 99.99,
        memoryUsage: 45.2,
        cpuUsage: 12.5,
      };
    }
  }

  async getSystemPerformance(): Promise<any> {
    return {
      health: 'healthy',
      p50: 45,
      p99: 250,
      errorRate: 0.15,
    };
  }
}
