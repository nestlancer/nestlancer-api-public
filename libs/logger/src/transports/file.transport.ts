import { appendFileSync, mkdirSync, existsSync, statSync, renameSync } from 'fs';
import { dirname } from 'path';

export interface FileTransportOptions {
  filePath: string;
  maxSizeBytes?: number;
  maxFiles?: number;
}

export class FileTransport {
  private readonly filePath: string;
  private readonly maxSizeBytes: number;
  private readonly maxFiles: number;

  constructor(options: FileTransportOptions) {
    this.filePath = options.filePath;
    this.maxSizeBytes = options.maxSizeBytes || 10 * 1024 * 1024; // 10MB default
    this.maxFiles = options.maxFiles || 5;

    // Ensure directory exists
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  write(output: string): void {
    this.rotateIfNeeded();
    appendFileSync(this.filePath, output + '\n');
  }

  private rotateIfNeeded(): void {
    try {
      if (!existsSync(this.filePath)) return;

      const stats = statSync(this.filePath);
      if (stats.size < this.maxSizeBytes) return;

      // Rotate files: app.log.4 → deleted, app.log.3 → app.log.4, etc.
      for (let i = this.maxFiles - 1; i >= 1; i--) {
        const from = i === 1 ? this.filePath : `${this.filePath}.${i - 1}`;
        const to = `${this.filePath}.${i}`;
        if (existsSync(from)) {
          renameSync(from, to);
        }
      }
    } catch {
      // Rotation errors are non-critical
    }
  }
}
