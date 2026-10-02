export interface QueueMessage<T = unknown> {
  id: string;
  type: string;
  payload: T;
  metadata: { correlationId: string; timestamp: string; source: string; retryCount?: number };
}
