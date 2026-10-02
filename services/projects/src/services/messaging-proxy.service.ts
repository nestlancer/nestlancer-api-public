import { HttpException, Injectable } from '@nestjs/common';

@Injectable()
export class MessagingProxyService {
  private baseUrl(): string {
    return (process.env.MESSAGING_SERVICE_URL ?? 'http://localhost:3010').replace(/\/$/, '');
  }

  /**
   * Forwards to the messaging microservice (same contract as the HTTP gateway).
   */
  async postProjectMessage(
    authorization: string | undefined,
    projectId: string,
    body: { content: string; type?: string },
  ): Promise<unknown> {
    const url = `${this.baseUrl()}/api/v1/messages/project/${encodeURIComponent(projectId)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body: JSON.stringify({ content: body.content, type: body.type ?? 'TEXT' }),
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
