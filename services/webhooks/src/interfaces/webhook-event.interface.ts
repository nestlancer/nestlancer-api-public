export interface WebhookEvent {
  /**
   * The provider that sent the webhook (e.g., razorpay)
   */
  provider: string;

  /**
   * The type of event (e.g., payment.captured)
   */
  eventType: string;

  /**
   * The unique ID of the event from the provider.
   * Null if the provider does not supply unique event IDs.
   */
  eventId: string | null;

  /**
   * The timestamp of when the event occurred
   */
  timestamp: Date;

  /**
   * Processed data/payload to be sent to the target queue
   */
  data: Record<string, any>;

  /**
   * The target RabbitMQ queue to dispatch this event to
   */
  targetQueue?: string;
}
