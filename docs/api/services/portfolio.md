<div align="center">

# Portfolio Service Endpoints

</div>

---

## 13. Portfolio Service

**Base Path**: `/api/v1/portfolio`
**Admin Path**: `/api/v1/admin/portfolio`

### 13.1 Overview

Manages public portfolio items showcasing completed projects. Supports categories, tags, featured items, and client testimonials.

> **Architecture Note (Media Visibility):** Portfolio items use media from private projects. When an item enters `published` status, the backend triggers the `Portfolio Sync Worker`, which securely copies the referenced private media files into the public CDN bucket (`nestlancer-public`), returning highly optimized, public CDN URLs for the frontend.

### 13.2 Portfolio Status

| Status      | Description        | Visible    |
| :---------- | :----------------- | :--------- |
| `draft`     | Work in progress   | Admin only |
| `published` | Live and visible   | Public     |
| `archived`  | Hidden from public | Admin only |

### 13.3 Public Endpoints (No Auth)

| Method | Endpoint      | Description                        | Rate Limit   | Cache    |
| :----- | :------------ | :--------------------------------- | :----------- | :------- |
| `GET`  | `/health`     | Health check (Simplified response) | 1000/hour    | Yes      |
| `GET`  | `/`           | List published items               | 1000/hour/IP | 1 hour   |
| `GET`  | `/{idOrSlug}` | Get item details                   | 2000/hour/IP | 1 hour   |
| `GET`  | `/featured`   | Get featured items                 | 2000/hour/IP | 1 hour   |
| `GET`  | `/categories` | List categories                    | 2000/hour/IP | 24 hours |
| `GET`  | `/tags`       | List tags with counts              | 2000/hour/IP | 1 hour   |
| `GET`  | `/search`     | Search portfolio                   | 500/hour/IP  | 15 min   |
| `POST` | `/{id}/like`  | Like item (anonymous)              | 100/hour/IP  | N/A      |

### 13.4 Admin Endpoints (Admin JWT Required)

| Method   | Endpoint                | Description                   | Rate Limit | Idempotent |     | Role |
| :------- | :---------------------- | :---------------------------- | :--------- | :--------- | :-- | :--- |
| `GET`    | `/`                     | List all items (incl. drafts) | 2000/hour  | Yes        |
| `POST`   | `/`                     | Create portfolio item         | 100/hour   | No         |
| `GET`    | `/{id}`                 | Get item (admin view)         | 2000/hour  | Yes        |
| `PATCH`  | `/{id}`                 | Update item                   | 200/hour   | No         |
| `DELETE` | `/{id}`                 | Delete item                   | 100/hour   | Yes (soft) |
| `POST`   | `/{id}/publish`         | Publish draft                 | 200/hour   | Yes        |
| `POST`   | `/{id}/unpublish`       | Unpublish item                | 200/hour   | Yes        |
| `POST`   | `/{id}/archive`         | Archive item                  | 200/hour   | Yes        |
| `POST`   | `/{id}/toggle-featured` | Toggle featured status        | 200/hour   | No         |
| `PATCH`  | `/{id}/privacy`         | Update privacy settings       | 200/hour   | No         |
| `POST`   | `/{id}/duplicate`       | Duplicate item                | 100/hour   | No         |
| `POST`   | `/reorder`              | Reorder items                 | 50/hour    | No         |
| `GET`    | `/analytics`            | Portfolio analytics           | 1000/hour  | Yes        |
| `GET`    | `/analytics/{id}`       | Item analytics                | 1000/hour  | Yes        |
| `POST`   | `/bulk-update`          | Bulk operations               | 50/hour    | No         |
| `GET`    | `/categories`           | List categories (admin)       | 500/hour   | Yes        |
| `POST`   | `/categories`           | Create category               | 50/hour    | No         |
| `PATCH`  | `/categories/{id}`      | Update category               | 100/hour   | No         |
| `DELETE` | `/categories/{id}`      | Delete category               | 50/hour    | Yes        |

### 13.5 Request/Response Examples

> **Note:** For brevity, `X-CSRF-Token` is omitted from state-changing examples unless specifically highlighted. It is only required when using cookie-based authentication. Rate limit headers are shown in the first example as a reference for all responses.

#### GET / (Public)

```json
// Request
GET /api/v1/portfolio?page=1&limit=12&category=webDevelopment&featured=true
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
      "id": "portAbc123",
      "slug": "ecommerce-platform-acme",
      "title": "E-commerce Platform for Acme Corp",
      "shortDescription": "Modern e-commerce solution with 50% increase in conversions",
      "thumbnail": {
        "url": "https://cdn.example.com/portfolio/portAbc123/thumbnail.jpg",
        "alt": "Acme Corp E-commerce homepage"
      },
      "category": {
        "id": "catWeb",
        "name": "Web Development",
        "slug": "web-development"
      },
      "tags": ["react", "nodejs", "ecommerce", "stripe"],
      "featured": true,
      "client": {
        "name": "Acme Corp",
        "logo": "https://cdn.example.com/logos/acme.png",
        "industry": "Retail"
      },
      "stats": {
        "likes": 245,
        "views": 1520
      },
      "completedAt": "2024-01-15",
      "createdAt": "2024-01-20T10:30:00.000Z"
    },
    {
      "id": "portDef456",
      "slug": "mobile-app-fintech",
      "title": "Mobile Banking App",
      "shortDescription": "Secure mobile banking with biometric authentication",
      "thumbnail": {
        "url": "https://cdn.example.com/portfolio/portDef456/thumbnail.jpg",
        "alt": "Mobile banking app interface"
      },
      "category": {
        "id": "catMobile",
        "name": "Mobile Development",
        "slug": "mobile-development"
      },
      "tags": ["react-native", "fintech", "security"],
      "featured": true,
      "client": {
        "name": "FinBank",
        "logo": "https://cdn.example.com/logos/finbank.png"
      },
      "stats": {
        "likes": 189,
        "views": 980
      },
      "completedAt": "2023-12-01",
      "createdAt": "2023-12-15T14:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 24,
    "totalPages": 2,
    "hasNext": true,
    "hasPrev": false
  },
  "filters": {
    "category": "webDevelopment",
    "featured": true
  },
  "metadata": {
    "timestamp": "2024-02-18T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1",
    "cached": true,
    "cacheExpires": "2024-02-18T11:30:00.000Z"
  }
}
```

#### GET /{idOrSlug} (Public)

```json
// Request
GET /api/v1/portfolio/ecommerce-platform-acme
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
    "id": "portAbc123",
    "slug": "ecommerce-platform-acme",
    "title": "E-commerce Platform for Acme Corp",
    "shortDescription": "Modern e-commerce solution with 50% increase in conversions",
    "fullDescription": "## Project Overview\n\nAcme Corp needed a complete overhaul of their e-commerce platform to handle growing traffic and improve user experience...\n\n## Challenges\n\n- Legacy system migration\n- High traffic handling\n- Mobile-first approach\n\n## Solutions\n\n- Built custom React frontend with SSR\n- Implemented microservices architecture\n- Designed responsive UI/UX",
    "contentFormat": "markdown",
    "category": {
      "id": "catWeb",
      "name": "Web Development",
      "slug": "web-development"
    },
    "tags": [
      { "name": "react", "slug": "react" },
      { "name": "nodejs", "slug": "nodejs" },
      { "name": "ecommerce", "slug": "ecommerce" },
      { "name": "stripe", "slug": "stripe" }
    ],
    "featured": true,
    "images": [
      {
        "id": "mediaImg1",
        "url": "https://cdn.example.com/portfolio/portAbc123/img1.jpg",
        "thumbnail": "https://cdn.example.com/portfolio/portAbc123/img1Thumb.jpg",
        "alt": "Homepage design",
        "caption": "Modern homepage with hero section",
        "order": 1
      },
      {
        "id": "mediaImg2",
        "url": "https://cdn.example.com/portfolio/portAbc123/img2.jpg",
        "thumbnail": "https://cdn.example.com/portfolio/portAbc123/img2Thumb.jpg",
        "alt": "Product listing page",
        "caption": "Product listing with advanced filters",
        "order": 2
      },
      {
        "id": "mediaImg3",
        "url": "https://cdn.example.com/portfolio/portAbc123/img3.jpg",
        "thumbnail": "https://cdn.example.com/portfolio/portAbc123/img3Thumb.jpg",
        "alt": "Checkout flow",
        "caption": "Streamlined checkout process",
        "order": 3
      }
    ],
    "thumbnail": {
      "url": "https://cdn.example.com/portfolio/portAbc123/thumbnail.jpg",
      "alt": "Acme Corp E-commerce homepage"
    },
    "video": {
      "url": "https://cdn.example.com/portfolio/portAbc123/demo.mp4",
      "thumbnail": "https://cdn.example.com/portfolio/portAbc123/videoThumb.jpg",
      "duration": 120
    },
    "client": {
      "name": "Acme Corp",
      "logo": "https://cdn.example.com/logos/acme.png",
      "industry": "Retail",
      "website": "https://www.acmecorp.com",
      "testimonial": {
        "text": "Working with this freelancer was an absolute pleasure. They delivered a world-class e-commerce platform that exceeded our expectations. Our conversion rates increased by 50% within the first quarter!",
        "author": "Jane Smith",
        "role": "CTO",
        "avatar": "https://cdn.example.com/testimonials/jane.jpg"
      }
    },
    "projectDetails": {
      "duration": "4 months",
      "completedAt": "2024-01-15",
      "technologies": [
        { "name": "React", "icon": "react" },
        { "name": "Node.js", "icon": "nodejs" },
        { "name": "PostgreSQL", "icon": "postgresql" },
        { "name": "Redis", "icon": "redis" },
        { "name": "AWS", "icon": "aws" },
        { "name": "Stripe", "icon": "stripe" }
      ],
      "features": [
        "Product catalog with 10,000+ items",
        "Advanced search with filters",
        "Real-time inventory management",
        "Multiple payment gateways",
        "Order tracking system",
        "Admin dashboard",
        "Analytics integration",
        "Mobile-responsive design"
      ],
      "results": [
        { "metric": "Conversion Rate", "value": "+50%", "icon": "chart-up" },
        { "metric": "Page Load Time", "value": "-60%", "icon": "speed" },
        { "metric": "Mobile Traffic", "value": "+75%", "icon": "mobile" },
        { "metric": "Cart Abandonment", "value": "-35%", "icon": "cart" }
      ]
    },
    "links": {
      "live": "https://shop.acmecorp.com",
      "caseStudy": "/blog/case-study-acme-ecommerce",
      "github": null
    },
    "seo": {
      "title": "E-commerce Platform for Acme Corp | Portfolio",
      "description": "Case study: Building a modern e-commerce platform with React and Node.js that increased conversions by 50%",
      "keywords": ["ecommerce", "react", "case study"]
    },
    "stats": {
      "likes": 245,
      "views": 1520
    },
    "relatedItems": [
      {
        "id": "portRelated1",
        "slug": "marketplace-platform",
        "title": "Marketplace Platform",
        "thumbnail": "https://cdn.example.com/portfolio/portRelated1/thumb.jpg"
      },
      {
        "id": "portRelated2",
        "slug": "pos-system",
        "title": "Point of Sale System",
        "thumbnail": "https://cdn.example.com/portfolio/portRelated2/thumb.jpg"
      }
    ],
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-02-15T14:00:00.000Z",
    "publishedAt": "2024-01-20T12:00:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-02-18T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1",
    "cached": true
  }
}
```

#### POST / (Admin - Create Item)

```json
// Request
POST /api/v1/admin/portfolio
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "title": "Mobile Banking App for FinBank",
  "slug": "mobile-banking-finbank",
  "shortDescription": "Secure mobile banking solution with biometric authentication",
  "fullDescription": "## Project Overview\n\nFinBank needed a modern mobile banking app...",
  "contentFormat": "markdown",
  "categoryId": "catMobile",
  "tags": ["react-native", "fintech", "security", "biometrics"],
  "thumbnail": "mediaThumbXyz",
  "images": [
    {
      "mediaId": "mediaImg1",
      "alt": "Login screen",
      "caption": "Biometric login screen",
      "order": 1
    },
    {
      "mediaId": "mediaImg2",
      "alt": "Dashboard",
      "caption": "Account dashboard",
      "order": 2
    }
  ],
  "video": {
    "mediaId": "mediaVideo1"
  },
  "client": {
    "name": "FinBank",
    "logo": "mediaLogoFinbank",
    "industry": "Financial Services",
    "website": "https://www.finbank.com",
    "testimonial": {
      "text": "The app exceeded our security requirements while maintaining excellent UX.",
      "author": "John Smith",
      "role": "VP of Digital",
      "avatar": "mediaAvatarJohn"
    },
    "displayPermission": true
  },
  "projectDetails": {
    "duration": "6 months",
    "completedAt": "2023-12-01",
    "technologies": ["React Native", "Node.js", "PostgreSQL", "AWS", "Plaid"],
    "features": [
      "Biometric authentication",
      "Real-time transactions",
      "Bill payments",
      "P2P transfers"
    ],
    "results": [
      { "metric": "App Store Rating", "value": "4.8★" },
      { "metric": "Downloads", "value": "500K+" }
    ]
  },
  "links": {
    "appStore": "https://apps.apple.com/app/finbank",
    "playStore": "https://play.google.com/store/apps/details?id=com.finbank",
    "caseStudy": null
  },
  "seo": {
    "title": "Mobile Banking App Case Study | FinBank",
    "description": "How we built a secure mobile banking app with 500K+ downloads",
    "keywords": ["mobile banking", "fintech", "react native"]
  },
  "status": "draft",
  "featured": false,
  "order": 5
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
  "message": "Portfolio item created successfully",
  "data": {
    "id": "portNew789",
    "slug": "mobile-banking-finbank",
    "title": "Mobile Banking App for FinBank",
    "status": "draft",
    "featured": false,
    "createdAt": "2024-02-18T10:30:00.000Z",
    "updatedAt": "2024-02-18T10:30:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-02-18T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### POST /{id}/publish (Admin)

```json
// Request
POST /api/v1/admin/portfolio/portNew789/publish
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "scheduledFor": null,
  "notifySubscribers": true
}

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
  "message": "Portfolio item published successfully. Media synchronization started.",
  "data": {
    "id": "portNew789",
    "slug": "mobile-banking-finbank",
    "status": "published",
    "publishedAt": "2024-02-18T10:35:00.000Z",
    "publicUrl": "https://yourdomain.com/portfolio/mobile-banking-finbank",
    "mediaSync": {
      "status": "in_progress",
      "items": 3
    }
  },
  "metadata": {
    "timestamp": "2024-02-18T10:35:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}

// Error Response (400 - Missing required fields)
HTTP/1.1 400 - Missing required fields
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323000
X-API-Version: v1
X-Request-ID: reqAbc123

{
  "status": "error",
  "error": {
    "code": "PORTFOLIO_005",
    "message": "Cannot publish without thumbnail",
    "details": {
      "missingFields": ["thumbnail"],
      "validationErrors": [
        {
          "field": "thumbnail",
          "message": "Thumbnail image is required for publishing"
        }
      ]
    }
  },
  "metadata": {
    "timestamp": "2024-02-18T10:35:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### GET /analytics (Admin)

```json
// Request
GET /api/v1/admin/portfolio/analytics?period=30d
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
  "data": {
    "period": {
      "start": "2024-01-19",
      "end": "2024-02-18",
      "days": 30
    },
    "overview": {
      "totalItems": 24,
      "publishedItems": 20,
      "draftItems": 3,
      "archivedItems": 1,
      "featuredItems": 6
    },
    "engagement": {
      "totalViews": 15200,
      "totalLikes": 890,
      "avgViewsPerItem": 633,
      "viewsTrend": "+12%",
      "likesTrend": "+8%"
    },
    "topPerformers": [
      {
        "id": "portAbc123",
        "title": "E-commerce Platform",
        "views": 1520,
        "likes": 245,
        "conversionRate": 2.5
      },
      {
        "id": "portDef456",
        "title": "Mobile Banking App",
        "views": 980,
        "likes": 189,
        "conversionRate": 1.8
      }
    ],
    "viewsByCategory": {
      "webDevelopment": 8500,
      "mobileDevelopment": 4200,
      "design": 2500
    },
    "viewsByDay": [
      { "date": "2024-02-12", "views": 450 },
      { "date": "2024-02-13", "views": 520 },
      { "date": "2024-02-14", "views": 680 },
      { "date": "2024-02-15", "views": 510 },
      { "date": "2024-02-16", "views": 490 },
      { "date": "2024-02-17", "views": 380 },
      { "date": "2024-02-18", "views": 420 }
    ],
    "traffic": {
      "sources": {
        "direct": 45,
        "organic": 30,
        "social": 15,
        "referral": 10
      },
      "devices": {
        "desktop": 55,
        "mobile": 38,
        "tablet": 7
      }
    }
  },
  "metadata": {
    "timestamp": "2024-02-18T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

### 13.6 Error Codes

| Code            | HTTP Status | Description                       | Retryable |
| :-------------- | :---------- | :-------------------------------- | :-------- |
| `PORTFOLIO_001` | 404         | Item not found                    | No        |
| `PORTFOLIO_002` | 403         | Unauthorized access               | No        |
| `PORTFOLIO_003` | 422         | Invalid category                  | No        |
| `PORTFOLIO_004` | 409         | Slug already exists               | No        |
| `PORTFOLIO_005` | 400         | Cannot publish without thumbnail  | No        |
| `PORTFOLIO_006` | 400         | Cannot publish without images     | No        |
| `PORTFOLIO_007` | 400         | Invalid status transition         | No        |
| `PORTFOLIO_008` | 400         | Cannot delete published item      | No        |
| `PORTFOLIO_009` | 404         | Category not found                | No        |
| `PORTFOLIO_010` | 400         | Cannot delete category with items | No        |

---
