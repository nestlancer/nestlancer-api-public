import { PipeTransform, Injectable } from '@nestjs/common';

import { escapeHtml } from '../utils/sanitize.util';

/**
 * Sanitizes string inputs to prevent XSS and injection attacks.
 */
@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: unknown): unknown {
    if (typeof value === 'string') {
      return this.sanitize(value);
    }
    if (typeof value === 'object' && value !== null) {
      return this.sanitizeObject(value as Record<string, unknown>);
    }
    return value;
  }

  private sanitize(input: string): string {
    return escapeHtml(input);
  }

  private sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = typeof value === 'string' ? this.sanitize(value) : value;
    }
    return sanitized;
  }
}
