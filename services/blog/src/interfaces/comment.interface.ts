export interface PostWithRelations {
  id: string;
  title: string;
  slug: string;
  content: string;
}

export interface ThreadedComment {
  id: string;
  content: string;
  replies?: ThreadedComment[];
}

export interface ModerationResult {
  isApproved: boolean;
  score: number;
  reason?: string;
}
