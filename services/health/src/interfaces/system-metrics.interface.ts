export interface SystemMetrics {
  cpu: {
    usagePercent: number;
    loadAverage: number[];
  };
  memory: {
    totalBytes: number;
    freeBytes: number;
    usedBytes: number;
    usagePercent: number;
  };
  disk: {
    totalBytes: number;
    freeBytes: number;
    usedBytes: number;
    usagePercent: number;
  };
  network: {
    bytesInProcess: number;
    bytesOutProcess: number;
  };
  timestamp: Date;
}
