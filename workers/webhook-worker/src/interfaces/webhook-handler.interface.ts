export interface WebhookHandler {
  canHandle(provider: string, eventType: string): boolean;
  handle(payload: any): Promise<void>;
}
