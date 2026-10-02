import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
  Optional,
  OnModuleInit,
} from '@nestjs/common';
import { CacheService } from '@nestlancer/cache';

import { MAINTENANCE_CACHE_KEY } from './maintenance-cache';

type MaintenanceState = {
  enabled?: boolean;
  message?: string;
  estimatedEnd?: string | null;
};

/**
 * Blocks non-admin API traffic while maintenance mode is enabled.
 * State is read from Redis (`system:maintenance`) with a short in-memory TTL.
 */
@Injectable()
export class MaintenanceGuard implements CanActivate, OnModuleInit {
  private readonly logger = new Logger(MaintenanceGuard.name);
  private cached: MaintenanceState | null = null;
  private cachedAt = 0;
  private readonly CACHE_TTL_MS = 500;

  constructor(@Optional() private readonly cacheService?: CacheService) {}

  async onModuleInit() {
    if (!this.cacheService) return;
    await this.refresh().catch((err) =>
      this.logger.warn(`Initial maintenance state load failed: ${(err as Error).message}`),
    );
  }

  /** Used by unit tests / local overrides. */
  setMaintenanceMode(enabled: boolean, message?: string) {
    this.cached = {
      enabled,
      message: message || 'System is under maintenance',
    };
    this.cachedAt = Date.now();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const state = await this.getState();
    if (!state?.enabled) return true;

    const req = context.switchToHttp().getRequest();
    const path = String(req.path || req.url || '');
    const method = String(req.method || 'GET').toUpperCase();

    if (this.isExemptPath(path, method)) return true;

    const role = req.user?.role;

    if (String(role || '').toUpperCase() === 'ADMIN') return true;

    throw new HttpException(
      {
        code: 'SYS_MAINTENANCE',
        message: state.message || 'System is under maintenance',
        estimatedEnd: state.estimatedEnd ?? null,
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  private isExemptPath(path: string, method: string): boolean {
    const p = path.toLowerCase().split('?')[0] ?? '';
    if (p.includes('/health')) return true;
    if (p.includes('/auth/')) return true;
    if (p.includes('/docs') || p.includes('/swagger')) return true;
    if (p.includes('/system/status')) return true;
    if (p.includes('/webhooks/') && method === 'POST') return true;

    // Public marketing reads stay available so landing/portfolio/blog can render.
    // Admin and mutating routes remain blocked.
    if (method === 'GET' && !p.includes('/admin/')) {
      if (this.isPublicContentPath(p)) return true;
    }
    return false;
  }

  /** Published portfolio/blog content consumed by landing + public web pages. */
  private isPublicContentPath(path: string): boolean {
    // Match /portfolio, /api/v1/portfolio, /blog, /api/v1/blog/...
    return /(^|\/)(portfolio|blog)(\/|$)/.test(path);
  }

  private async getState(): Promise<MaintenanceState | null> {
    const now = Date.now();
    if (this.cached && now - this.cachedAt < this.CACHE_TTL_MS) {
      return this.cached;
    }
    if (!this.cacheService) return this.cached ?? { enabled: false };
    return this.refresh();
  }

  private async refresh(): Promise<MaintenanceState | null> {
    if (!this.cacheService) return this.cached ?? { enabled: false };
    try {
      const state = await this.cacheService.get<MaintenanceState>(MAINTENANCE_CACHE_KEY);
      this.cached = state && typeof state === 'object' ? state : { enabled: false };
      this.cachedAt = Date.now();
      return this.cached;
    } catch (err) {
      this.logger.warn(`Maintenance cache read failed: ${(err as Error).message}`);
      return this.cached ?? { enabled: false };
    }
  }
}
