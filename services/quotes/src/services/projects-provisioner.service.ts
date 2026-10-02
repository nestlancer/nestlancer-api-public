import { Injectable, Logger } from '@nestjs/common';

export interface ProvisionFromQuotePayload {
  quoteId: string;
  requestId: string;
  userId: string;
}

export interface ProvisionFromQuoteResult {
  projectId: string;
  quoteId: string;
  requestId: string;
  status: string;
  created: boolean;
}

@Injectable()
export class ProjectsProvisionerService {
  private readonly logger = new Logger(ProjectsProvisionerService.name);

  private baseUrl(): string {
    return (process.env.PROJECTS_SERVICE_URL ?? 'http://localhost:3008').replace(/\/$/, '');
  }

  /**
   * Synchronously create (or return) the project for an accepted quote.
   * Failures are logged; callers still rely on outbox + client poll as fallback.
   */
  async provisionFromAcceptedQuote(
    payload: ProvisionFromQuotePayload,
  ): Promise<ProvisionFromQuoteResult | null> {
    const url = `${this.baseUrl()}/api/v1/internal/projects/provision-from-quote`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(25_000),
      });

      const text = await res.text();
      let body: unknown = {};
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        body = { raw: text };
      }

      if (!res.ok) {
        this.logger.warn(
          `Project provision HTTP ${res.status} for quote ${payload.quoteId}: ${text.slice(0, 500)}`,
        );
        return null;
      }

      const data =
        body && typeof body === 'object' && 'data' in (body as object)
          ? (body as { data: ProvisionFromQuoteResult }).data
          : (body as ProvisionFromQuoteResult);

      if (!data?.projectId) {
        this.logger.warn(`Project provision missing projectId for quote ${payload.quoteId}`);
        return null;
      }

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Project provision failed for quote ${payload.quoteId}: ${message}`,
      );
      return null;
    }
  }
}
