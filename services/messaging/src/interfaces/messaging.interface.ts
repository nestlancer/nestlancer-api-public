import { MessageType } from '@nestlancer/common';

export { MessageType };

export interface MessageReadReceipt {
  userId: string;
  readAt: Date;
}

export interface Message {
  id: string;
  projectId: string;
  senderId: string;
  content?: string;
  replyToId?: string;
  type: MessageType;
  readBy?: MessageReadReceipt[];
  /** Metadata blob (pins, mentions, group system events) */
  reactions?: unknown;
  editedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
