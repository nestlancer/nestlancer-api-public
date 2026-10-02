export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data: {
    url?: string;
    notificationId?: string;
    type?: string;
  };
}
