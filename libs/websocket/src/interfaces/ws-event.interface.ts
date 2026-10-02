export interface WsEvent<T = unknown> {
  event: string;
  data: T;
  metadata?: { correlationId?: string; timestamp?: string };
}
export interface WsRoom {
  name: string;
  participants: string[];
}
