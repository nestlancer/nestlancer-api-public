export class Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  headers?: Record<string, string> | null;
  secret: string;
  enabled: boolean;
  retryPolicy?: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}
