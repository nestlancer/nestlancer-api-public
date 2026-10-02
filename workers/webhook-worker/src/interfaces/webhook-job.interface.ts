export interface OutgoingWebhookJob {
  webhookId: string;
  event: string;
  payload: any;
  attempt: number;
}

export interface IncomingWebhookJob {
  provider: string;
  eventType: string;
  eventId: string;
  payload: any;
  incomingWebhookId: string;
}
