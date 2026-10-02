import { WebhookEvent } from './webhook-event.interface';

export interface WebhookProvider {
  /**
   * Provider name (e.g., 'razorpay', 'cloudflare')
   */
  readonly name: string;

  /**
   * Verify the webhook signature against the raw body
   * @param rawBody - Raw body buffer of the request
   * @param headers - HTTP headers from the request
   * @returns boolean indicating if the signature is valid
   */
  verifySignature(rawBody: Buffer, headers: Record<string, string>): boolean;

  /**
   * Parse the vendor-specific payload into a standard WebhookEvent
   * @param payload - The parsed JSON body of the request
   * @param headers - HTTP headers from the request
   * @returns Standardized WebhookEvent
   */
  parseEvent(payload: Record<string, any>, headers: Record<string, string>): WebhookEvent;
}
