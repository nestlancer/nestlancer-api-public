export interface AlertPayload {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  source: string;
  metadata?: Record<string, unknown>;
}
