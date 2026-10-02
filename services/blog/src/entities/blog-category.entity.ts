export class BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  postCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class BlogTag {
  id: string;
  name: string;
  slug: string;
}
