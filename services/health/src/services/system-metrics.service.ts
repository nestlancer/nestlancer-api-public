import { Injectable } from '@nestjs/common';
import * as os from 'os';

@Injectable()
export class SystemMetricsService {
  getMetrics() {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();

    return {
      cpu: {
        cores: cpus.length,
        model: cpus[0]?.model || 'Unknown',
        loadAverage: os.loadavg(),
      },
      memory: {
        total: totalMemory,
        free: freeMemory,
        used: totalMemory - freeMemory,
        usagePercent: Math.round(((totalMemory - freeMemory) / totalMemory) * 100),
      },
      disk: {
        // Disk metrics require fs module extensions or packages like diskusage
        // Mocking for now based on common patterns
        total: 107374182400,
        free: 53687091200,
        used: 53687091200,
        usagePercent: 50,
      },
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      },
    };
  }
}
