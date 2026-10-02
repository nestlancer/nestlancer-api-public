export class Bookmark {
  postId: string;
  userId: string;
  createdAt: Date;
}

export class PostLike {
  postId: string;
  userId: string;
}

export class PostView {
  postId: string;
  ipHash: string;
  userAgent?: string;
  referrer?: string;
  createdAt: Date;
}
