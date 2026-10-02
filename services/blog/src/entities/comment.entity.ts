import { CommentStatus } from '@nestlancer/common';

export { CommentStatus };

export class Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  parentId?: string;
  likeCount: number;
  isPinned: boolean;
  status: CommentStatus;
  editedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
}
