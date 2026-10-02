export interface OutboxEventPayload {
  aggregateType: string;
  aggregateId: string;
  eventType?: string; // Kept for backward compatibility if needed, but type is preferred
  type: string;
  payload: Record<string, unknown>;
}
