<div align="center">

# Blog Service Endpoints

</div>

---

## 14. Blog Service

**Base Path**: `/api/v1/blog`
**Admin Path**: `/api/v1/admin/blog`

### 14.1 Overview

Full-featured blog system with posts, categories, tags, comments, and SEO optimization. Supports markdown content, scheduled publishing, and comment moderation.

> **Architecture Note (Media Visibility):** Blog posts often utilize media uploaded to the system. Similar to Portfolios, when a blog post transitions to `published` status, the backend triggers the `Media Worker` to securely synchronize associated private media files into the public CDN bucket (`nestlancer-public`). This returns highly optimized, cacheable CDN URLs.

### 14.2 Post Status

| Status      | Description               | Visible    |
| :---------- | :------------------------ | :--------- |
| `draft`     | Work in progress          | Admin only |
| `scheduled` | Scheduled for publication | Admin only |
| `published` | Live and visible          | Public     |
| `archived`  | Hidden from public        | Admin only |

### 14.3 Comment Status

| Status     | Description                   |
| :--------- | :---------------------------- |
| `pending`  | Awaiting moderation           |
| `approved` | Visible to public             |
| `rejected` | Not visible, kept for records |
| `spam`     | Flagged as spam               |

### 14.4 Public Endpoints (No Auth)

| Method | Endpoint                | Description                        | Rate Limit   | Cache    |
| :----- | :---------------------- | :--------------------------------- | :----------- | :------- |
| `GET`  | `/health`               | Health check (Simplified response) | 1000/hour    | Yes      |
| `GET`  | `/posts`                | List published posts               | 2000/hour    | 15 min   |
| `GET`  | `/posts/{slug}`         | Get post details                   | 2000/hour    | 15 min   |
| `GET`  | `/posts/{slug}/related` | Get related posts                  | 1000/hour    | 1 hour   |
| `GET`  | `/categories`           | List categories                    | 2000/hour    | 24 hours |
| `GET`  | `/categories/{slug}`    | Get category with posts            | 1000/hour    | 1 hour   |
| `GET`  | `/tags`                 | List tags with counts              | 2000/hour    | 1 hour   |
| `GET`  | `/tags/{slug}`          | Get tag with posts                 | 1000/hour    | 1 hour   |
| `GET`  | `/authors`              | List authors                       | 1000/hour    | 1 hour   |
| `GET`  | `/authors/{id}`         | Get author with posts              | 1000/hour    | 1 hour   |
| `GET`  | `/search`               | Search posts                       | 500/hour     | 15 min   |
| `GET`  | `/feed/rss`             | RSS feed                           | 500/hour     | 1 hour   |
| `GET`  | `/feed/atom`            | Atom feed                          | 500/hour     | 1 hour   |
| `POST` | `/posts/{slug}/view`    | Track view                         | 5000/hour/IP | N/A      |

### 14.5 User Endpoints (JWT Required)

| Method   | Endpoint                        | Description           | Rate Limit | Idempotent |
| :------- | :------------------------------ | :-------------------- | :--------- | :--------- |
| `POST`   | `/posts/{slug}/like`            | Like/unlike post      | 500/hour   | Yes        |
| `GET`    | `/posts/{slug}/comments`        | Get comments          | 1000/hour  | Yes        |
| `POST`   | `/posts/{slug}/comments`        | Add comment           | 100/hour   | No         |
| `GET`    | `/comments/{commentId}`         | Get comment details   | 500/hour   | Yes        |
| `GET`    | `/comments/{commentId}/replies` | Get replies           | 500/hour   | Yes        |
| `POST`   | `/comments/{commentId}/reply`   | Reply to comment      | 100/hour   | No         |
| `PATCH`  | `/comments/{commentId}`         | Edit comment (15 min) | 100/hour   | No         |
| `DELETE` | `/comments/{commentId}`         | Delete own comment    | 100/hour   | Yes        |
| `POST`   | `/comments/{commentId}/like`    | Like comment          | 500/hour   | Yes        |
| `POST`   | `/comments/{commentId}/report`  | Report comment        | 50/hour    | No         |
| `GET`    | `/bookmarks`                    | Get bookmarked posts  | 500/hour   | Yes        |
| `POST`   | `/posts/{slug}/bookmark`        | Bookmark post         | 200/hour   | Yes        |
| `DELETE` | `/posts/{slug}/bookmark`        | Remove bookmark       | 200/hour   | Yes        |

### 14.6 Admin Endpoints (Admin JWT Required)

| Method   | Endpoint                                     | Description                            | Rate Limit | Idempotent |     | Role |
| :------- | :------------------------------------------- | :------------------------------------- | :--------- | :--------- | :-- | :--- |
| `POST`   | `/posts`                                     | Create post                            | 200/hour   | No         |
| `GET`    | `/posts`                                     | List all posts (incl. drafts)          | 1000/hour  | Yes        |
| `GET`    | `/posts/{id}`                                | Get post (admin view)                  | 1000/hour  | Yes        |
| `PATCH`  | `/posts/{id}`                                | Update post                            | 200/hour   | No         |
| `DELETE` | `/posts/{id}`                                | Delete post                            | 100/hour   | Yes (soft) |
| `POST`   | `/posts/{id}/publish`                        | Publish post                           | 200/hour   | Yes        |
| `POST`   | `/posts/{id}/schedule`                       | Schedule publication                   | 200/hour   | No         |
| `POST`   | `/posts/{id}/unpublish`                      | Unpublish post                         | 200/hour   | Yes        |
| `POST`   | `/posts/{id}/archive`                        | Archive post                           | 200/hour   | Yes        |
| `POST`   | `/posts/{id}/duplicate`                      | Duplicate post                         | 100/hour   | No         |
| `GET`    | `/posts/{id}/revisions`                      | Get revision history                   | 500/hour   | Yes        |
| `POST`   | `/posts/{id}/revisions/{revisionId}/restore` | Restore revision                       | 50/hour    | No         |
| `POST`   | `/posts/{id}/feature`                        | Mark post as featured                  | 200/hour   | Yes        |
| `POST`   | `/posts/{id}/unfeature`                      | Remove featured flag                   | 200/hour   | Yes        |
| `POST`   | `/posts/{id}/pin`                            | Pin post to top of feed                | 200/hour   | Yes        |
| `POST`   | `/posts/{id}/unpin`                          | Unpin post                             | 200/hour   | Yes        |
| `POST`   | `/posts/import`                              | Bulk import posts from external source | 50/hour    | No         |
| `POST`   | `/posts/export`                              | Export blog posts                      | 50/hour    | No         |
| `PATCH`  | `/posts/settings`                            | Update blog-wide settings              | 100/hour   | No         |
| `GET`    | `/comments`                                  | List all comments                      | 1000/hour  | Yes        |
| `GET`    | `/comments/pending`                          | List pending comments                  | 500/hour   | Yes        |
| `GET`    | `/comments/reported`                         | List reported comments                 | 500/hour   | Yes        |
| `POST`   | `/comments/{commentId}/approve`              | Approve comment                        | 500/hour   | Yes        |
| `POST`   | `/comments/{commentId}/reject`               | Reject comment                         | 500/hour   | Yes        |
| `POST`   | `/comments/{commentId}/spam`                 | Mark as spam                           | 500/hour   | Yes        |
| `DELETE` | `/comments/{commentId}`                      | Delete any comment                     | 500/hour   | Yes        |
| `POST`   | `/comments/{commentId}/pin`                  | Pin comment                            | 200/hour   | Yes        |
| `POST`   | `/comments/{commentId}/unpin`                | Unpin comment                          | 200/hour   | Yes        |
| `POST`   | `/categories`                                | Create category                        | 100/hour   | No         |
| `PATCH`  | `/categories/{id}`                           | Update category                        | 100/hour   | No         |
| `DELETE` | `/categories/{id}`                           | Delete category                        | 50/hour    | Yes        |
| `POST`   | `/tags`                                      | Create tag                             | 100/hour   | No         |
| `PATCH`  | `/tags/{id}`                                 | Update tag                             | 100/hour   | No         |
| `DELETE` | `/tags/{id}`                                 | Delete tag                             | 100/hour   | Yes        |
| `POST`   | `/tags/merge`                                | Merge tags                             | 50/hour    | No         |
| `GET`    | `/analytics`                                 | Blog analytics                         | 500/hour   | Yes        |
| `GET`    | `/analytics/posts/{id}`                      | Post analytics                         | 500/hour   | Yes        |

### 14.7 Request/Response Examples

> **Note:** For brevity, `X-CSRF-Token` is omitted from state-changing examples unless specifically highlighted. It is only required when using cookie-based authentication. Rate limit headers are shown in the first example as a reference for all responses.

#### GET /posts (Public)

```json
// Request
GET /api/v1/blog/posts?page=1&limit=10&category=tutorials
Accept: application/json

// Response (200 OK)
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "success",
  "data": [
    {
      "id": "postAbc123",
      "slug": "building-scalable-apis-nodejs",
      "title": "Building Scalable APIs with Node.js",
      "excerpt": "Learn how to build production-ready, scalable REST APIs using Node.js, Express, and best practices for performance optimization.",
      "featuredImage": {
        "url": "https://cdn.yourdomain.com/blog/postAbc123/featured.jpg",
        "alt": "Node.js API architecture diagram"
      },
      "category": {
        "id": "catTutorials",
        "name": "Tutorials",
        "slug": "tutorials"
      },
      "tags": [
        { "name": "Node.js", "slug": "nodejs" },
        { "name": "API", "slug": "api" },
        { "name": "Backend", "slug": "backend" }
      ],
      "author": {
        "id": "usrAuthor1",
        "name": "Sarah Johnson",
        "avatar": "https://cdn.example.com/avatars/sarah.jpg",
        "role": "admin"
      },
      "stats": {
        "views": 5420,
        "likes": 324,
        "comments": 45,
        "readTime": 12
      },
      "publishedAt": "2024-02-15T10:00:00.000Z",
      "updatedAt": "2024-02-16T14:30:00.000Z"
    },
    {
      "id": "postDef456",
      "slug": "react-performance-optimization",
      "title": "React Performance Optimization Techniques",
      "excerpt": "Master the art of optimizing React applications with these proven techniques...",
      "featuredImage": {
        "url": "https://cdn.yourdomain.com/blog/postDef456/featured.jpg",
        "alt": "React performance graph"
      },
      "category": {
        "id": "catTutorials",
        "name": "Tutorials",
        "slug": "tutorials"
      },
      "tags": [
        { "name": "React", "slug": "react" },
        { "name": "Performance", "slug": "performance" }
      ],
      "author": {
        "id": "usrAuthor2",
        "name": "Mike Chen",
        "avatar": "https://cdn.example.com/avatars/mike.jpg"
      },
      "stats": {
        "views": 3250,
        "likes": 198,
        "comments": 32,
        "readTime": 8
      },
      "publishedAt": "2024-02-12T09:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  },
  "metadata": {
    "timestamp": "2024-02-18T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1",
    "cached": true
  }
}
```

#### GET /posts/{slug} (Public)

````json
// Request
GET /api/v1/blog/posts/building-scalable-apis-nodejs
Accept: application/json

// Response (200 OK)
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "success",
  "data": {
    "id": "postAbc123",
    "slug": "building-scalable-apis-nodejs",
    "title": "Building Scalable APIs with Node.js",
    "excerpt": "Learn how to build production-ready, scalable REST APIs using Node.js...",
    "content": "# Building Scalable APIs with Node.js\n\nIn this comprehensive guide, we'll explore...\n\n## Introduction\n\nBuilding APIs that scale is crucial for modern web applications...\n\n## Setting Up the Project\n\n```javascript\nconst express = require('express');\nconst app = express();\n```\n\n...",
    "contentFormat": "markdown",
    "contentHtml": "<h1>Building Scalable APIs with Node.js</h1><p>In this comprehensive guide...</p>",
    "featuredImage": {
      "url": "https://cdn.yourdomain.com/blog/postAbc123/featured.jpg",
      "alt": "Node.js API architecture diagram",
      "caption": "Modern API architecture with Node.js"
    },
    "images": [
      {
        "id": "mediaBlog1",
        "url": "https://cdn.yourdomain.com/blog/postAbc123/diagram1.png",
        "alt": "Request flow diagram"
      }
    ],
    "category": {
      "id": "catTutorials",
      "name": "Tutorials",
      "slug": "tutorials",
      "description": "Step-by-step technical tutorials"
    },
    "tags": [
      { "id": "tagNodejs", "name": "Node.js", "slug": "nodejs" },
      { "id": "tagApi", "name": "API", "slug": "api" },
      { "id": "tagBackend", "name": "Backend", "slug": "backend" },
      { "id": "tagExpress", "name": "Express", "slug": "express" }
    ],
    "author": {
      "id": "usrAuthor1",
      "name": "Sarah Johnson",
      "avatar": "https://cdn.example.com/avatars/sarah.jpg",
      "bio": "Senior Developer with 10+ years of experience in backend development.",
      "role": "admin",
      "social": {
        "twitter": "https://twitter.com/sarahjohnson",
        "github": "https://github.com/sarahjohnson",
        "linkedin": "https://linkedin.com/in/sarahjohnson"
      }
    },
    "tableOfContents": [
      { "id": "introduction", "title": "Introduction", "level": 2 },
      { "id": "setting-up-the-project", "title": "Setting Up the Project", "level": 2 },
      { "id": "project-structure", "title": "Project Structure", "level": 3 },
      { "id": "database-design", "title": "Database Design", "level": 2 },
      { "id": "api-design", "title": "API Design", "level": 2 },
      { "id": "error-handling", "title": "Error Handling", "level": 2 },
      { "id": "testing", "title": "Testing", "level": 2 },
      { "id": "deployment", "title": "Deployment", "level": 2 },
      { "id": "conclusion", "title": "Conclusion", "level": 2 }
    ],
    "stats": {
      "views": 5420,
      "likes": 324,
      "comments": 45,
      "bookmarks": 89,
      "shares": 156,
      "readTime": 12
    },
    "seo": {
      "title": "Building Scalable APIs with Node.js | YourDomain Blog",
      "description": "Learn how to build production-ready, scalable REST APIs using Node.js, Express, and best practices.",
      "keywords": ["nodejs", "api", "scalable", "rest", "express"],
      "ogImage": "https://cdn.yourdomain.com/blog/postAbc123/og-image.jpg",
      "canonicalUrl": "https://yourdomain.com/blog/building-scalable-apis-nodejs"
    },
    "relatedPosts": [
      {
        "id": "postRelated1",
        "slug": "rest-api-best-practices",
        "title": "REST API Best Practices",
        "featuredImage": "https://cdn.yourdomain.com/blog/postRelated1/thumb.jpg"
      },
      {
        "id": "postRelated2",
        "slug": "nodejs-authentication",
        "title": "Authentication in Node.js",
        "featuredImage": "https://cdn.yourdomain.com/blog/postRelated2/thumb.jpg"
      }
    ],
    "commentsEnabled": true,
    "pinnedComment": {
      "id": "commentPinned1",
      "content": "Thanks for the great feedback everyone! I've added a section on caching based on your suggestions.",
      "author": {
        "name": "Sarah Johnson",
        "avatar": "https://cdn.example.com/avatars/sarah.jpg"
      },
      "createdAt": "2024-02-16T14:00:00.000Z"
    },
    "publishedAt": "2024-02-15T10:00:00.000Z",
    "updatedAt": "2024-02-16T14:30:00.000Z",
    "createdAt": "2024-02-14T09:00:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-02-18T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1",
    "cached": true
  }
}
````

#### POST /posts (Admin - Create Post)

```json
// Request
POST /api/v1/admin/blog/posts
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "title": "Getting Started with TypeScript",
  "slug": "getting-started-typescript",
  "excerpt": "A beginner's guide to TypeScript for JavaScript developers",
  "content": "# Getting Started with TypeScript\n\nTypeScript is a typed superset of JavaScript...",
  "contentFormat": "markdown",
  "featuredImage": "mediaFeaturedTs",
  "categoryId": "catTutorials",
  "tags": ["typescript", "javascript", "beginners"],
  "authorId": "usrAuthor1",
  "seo": {
    "title": "Getting Started with TypeScript | Tutorial",
    "description": "Learn TypeScript basics in this beginner-friendly guide",
    "keywords": ["typescript", "tutorial", "beginners"]
  },
  "commentsEnabled": true,
  "status": "draft"
}

// Response (201 Created)
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "success",
  "message": "Post created successfully",
  "data": {
    "id": "postNew789",
    "slug": "getting-started-typescript",
    "title": "Getting Started with TypeScript",
    "status": "draft",
    "createdAt": "2024-02-18T10:30:00.000Z",
    "editUrl": "/admin/blog/posts/postNew789/edit",
    "previewUrl": "/blog/preview/postNew789"
  },
  "metadata": {
    "timestamp": "2024-02-18T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### POST /posts/{slug}/comments (User)

```json
// Request
POST /api/v1/blog/posts/building-scalable-apis-nodejs/comments
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "content": "Great article! One question - how do you handle rate limiting in this setup?",
  "parentId": null
}

// Response (201 Created)
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "success",
  "message": "Comment submitted successfully",
  "data": {
    "id": "commentNew123",
    "content": "Great article! One question - how do you handle rate limiting in this setup?",
    "author": {
      "id": "usrAbc123",
      "name": "John Doe",
      "avatar": "https://cdn.example.com/avatars/john.jpg"
    },
    "status": "pending",
    "moderationMessage": "Your comment is awaiting moderation and will appear shortly.",
    "createdAt": "2024-02-18T10:30:00.000Z",
    "canEdit": true,
    "canDelete": true,
    "editableUntil": "2024-02-18T10:45:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-02-18T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### GET /posts/{slug}/comments

```json
// Request
GET /api/v1/blog/posts/building-scalable-apis-nodejs/comments?page=1&limit=20&sortBy=best
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

// Response (200 OK)
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "success",
  "data": [
    {
      "id": "comment1",
      "content": "This is exactly what I needed! I've been struggling with scaling our Node.js API.",
      "author": {
        "id": "usrCommenter1",
        "name": "Alice Smith",
        "avatar": "https://cdn.example.com/avatars/alice.jpg"
      },
      "likes": 42,
      "liked": true,
      "pinned": false,
      "replies": {
        "count": 3,
        "preview": [
          {
            "id": "reply1",
            "content": "Glad it helped! Let me know if you have questions.",
            "author": {
              "id": "usrAuthor1",
              "name": "Sarah Johnson",
              "avatar": "https://cdn.example.com/avatars/sarah.jpg",
              "isAuthor": true
            },
            "createdAt": "2024-02-15T14:00:00.000Z"
          }
        ]
      },
      "createdAt": "2024-02-15T12:00:00.000Z",
      "updatedAt": null,
      "edited": false
    },
    {
      "id": "comment2",
      "content": "Great article! One suggestion - you might want to add a section on caching strategies.",
      "author": {
        "id": "usrCommenter2",
        "name": "Bob Wilson",
        "avatar": "https://cdn.example.com/avatars/bob.jpg"
      },
      "likes": 28,
      "liked": false,
      "pinned": false,
      "replies": {
        "count": 1
      },
      "createdAt": "2024-02-15T15:30:00.000Z",
      "updatedAt": "2024-02-15T15:35:00.000Z",
      "edited": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  },
  "metadata": {
    "timestamp": "2024-02-18T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

### 14.8 Error Codes

| Code       | HTTP Status | Description                           | Retryable |
| :--------- | :---------- | :------------------------------------ | :-------- |
| `BLOG_001` | 404         | Post not found                        | No        |
| `BLOG_002` | 409         | Slug already exists                   | No        |
| `BLOG_003` | 404         | Comment not found                     | No        |
| `BLOG_004` | 400         | Edit time limit exceeded (15 min)     | No        |
| `BLOG_005` | 400         | Cannot comment on archived post       | No        |
| `BLOG_006` | 404         | Category not found                    | No        |
| `BLOG_007` | 400         | Cannot delete category with posts     | No        |
| `BLOG_008` | 422         | Invalid content format                | No        |
| `BLOG_009` | 202         | Comment pending moderation            | No        |
| `BLOG_010` | 409         | Already liked                         | No        |
| `BLOG_011` | 400         | Cannot publish without featured image | No        |
| `BLOG_012` | 400         | Comments disabled for this post       | No        |
| `BLOG_013` | 404         | Tag not found                         | No        |
| `BLOG_014` | 400         | Invalid scheduled date                | No        |

---
