export interface WsProjectEvent {
  projectId: string;
  eventType: string;
  data: unknown;
  timestamp: string;
}
export interface WsNotificationEvent {
  userId: string;
  notification: { type: string; title: string; message: string };
}
