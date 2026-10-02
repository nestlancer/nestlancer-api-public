import { HttpException, Injectable } from '@nestjs/common';

/**
 * Forwards milestone lifecycle calls to the progress microservice.
 * Keeps payments deprecated endpoints aligned with progress as source of truth.
 */
@Injectable()
export class ProgressProxyService {
  private baseUrl(): string {
    return (process.env.PROGRESS_SERVICE_URL ?? 'http://localhost:3009').replace(/\/$/, '');
  }

  async completeMilestone(
    authorization: string | undefined,
    milestoneId: string,
  ): Promise<unknown> {
    const url = `${this.baseUrl()}/api/v1/admin/milestones/${encodeURIComponent(milestoneId)}/complete`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body: '{}',
    });

    const text = await res.text();
    let payload: unknown = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { status: 'error', error: { message: text } };
    }

    if (!res.ok) {
      throw new HttpException(payload as object, res.status);
    }

    return payload;
  }
}
