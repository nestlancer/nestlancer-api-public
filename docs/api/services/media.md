<div align="center">

# Media Service Endpoints

</div>

---

## 12. Media Service

**Base Path**: `/api/v1/media`
**Admin Path**: `/api/v1/admin/media`

### 12.1 Overview

Handles file uploads, storage, processing, and delivery. Supports images, documents, videos, and archives with automatic processing, virus scanning, and CDN delivery.

> **Architecture Note (Dual Bucket):** The system uses a strict dual-bucket architecture for security.
>
> - **Private Bucket (`nestlancer-private`)**: All uploads land here by default. Files are strictly private and accessed via temporary, short-lived presigned URLs.
> - **Public Bucket (`nestlancer-public`)**: Files are copied here only when an entity (like a Portfolio item or Blog post) is officially published. The public bucket is connected to the CDN for high-performance, cacheable global delivery.

### 12.2 Supported File Types

#### Images

| Extension     | MIME Type     | Max Size | Processing                  |
| :------------ | :------------ | :------- | :-------------------------- |
| `jpg`, `jpeg` | image/jpeg    | 10MB     | Resize, compress, thumbnail |
| `png`         | image/png     | 10MB     | Resize, compress, thumbnail |
| `gif`         | image/gif     | 5MB      | Thumbnail                   |
| `webp`        | image/webp    | 10MB     | Resize, compress, thumbnail |
| `svg`         | image/svg+xml | 2MB      | Validation only             |

#### Documents

| Extension | MIME Type                                                                 | Max Size | Processing                 |
| :-------- | :------------------------------------------------------------------------ | :------- | :------------------------- |
| `pdf`     | application/pdf                                                           | 25MB     | Thumbnail, text extraction |
| `doc`     | application/msword                                                        | 25MB     | Virus scan                 |
| `docx`    | application/vnd.openxmlformats-officedocument.wordprocessingml.document   | 25MB     | Virus scan                 |
| `xls`     | application/vnd.ms-excel                                                  | 25MB     | Virus scan                 |
| `xlsx`    | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet         | 25MB     | Virus scan                 |
| `ppt`     | application/vnd.ms-powerpoint                                             | 50MB     | Virus scan                 |
| `pptx`    | application/vnd.openxmlformats-officedocument.presentationml.presentation | 50MB     | Virus scan                 |
| `txt`     | text/plain                                                                | 5MB      | None                       |

#### Archives

| Extension | MIME Type                    | Max Size | Processing                |
| :-------- | :--------------------------- | :------- | :------------------------ |
| `zip`     | application/zip              | 100MB    | Virus scan, contents list |
| `rar`     | application/x-rar-compressed | 100MB    | Virus scan                |
| `7z`      | application/x-7z-compressed  | 100MB    | Virus scan                |

#### Videos

| Extension | MIME Type       | Max Size | Processing           |
| :-------- | :-------------- | :------- | :------------------- |
| `mp4`     | video/mp4       | 500MB    | Thumbnail, transcode |
| `webm`    | video/webm      | 500MB    | Thumbnail, transcode |
| `mov`     | video/quicktime | 500MB    | Thumbnail, transcode |

### 12.3 User Endpoints (JWT Required)

| Method   | Endpoint                              | Description                               | Rate Limit | Idempotent |
| :------- | :------------------------------------ | :---------------------------------------- | :--------- | :--------- |
| `GET`    | `/health`                             | Health check (Simplified response)        | 1000/hour  | Yes        |
| `POST`   | `/upload/request`                     | Get presigned upload URL                  | 500/hour   | No         |
| `POST`   | `/upload/confirm`                     | Confirm upload completion                 | 500/hour   | Yes        |
| `POST`   | `/upload`                             | Direct upload (<10MB)                     | 200/hour   | No         |
| `POST`   | `/upload/chunked/init`                | Initialize chunked upload                 | 100/hour   | No         |
| `POST`   | `/upload/chunked/{uploadId}/part`     | Upload chunk                              | 500/hour   | Yes        |
| `POST`   | `/upload/chunked/{uploadId}/complete` | Complete chunked upload                   | 100/hour   | Yes        |
| `POST`   | `/upload/chunked/{uploadId}/abort`    | Abort chunked upload                      | 100/hour   | Yes        |
| `GET`    | `/`                                   | List user's media                         | 1000/hour  | Yes        |
| `GET`    | `/{mediaId}`                          | Get media details                         | 2000/hour  | Yes        |
| `PATCH`  | `/{mediaId}`                          | Update metadata                           | 500/hour   | No         |
| `DELETE` | `/{mediaId}`                          | Delete media                              | 200/hour   | Yes (soft) |
| `GET`    | `/{mediaId}/status`                   | Check processing status                   | 2000/hour  | Yes        |
| `POST`   | `/{mediaId}/regenerate-thumbnail`     | Regenerate thumbnail                      | 50/hour    | No         |
| `GET`    | `/{mediaId}/download`                 | Get temporary presigned download/view URL | 1000/hour  | Yes        |
| `GET`    | `/{mediaId}/versions`                 | Get file versions                         | 500/hour   | Yes        |
| `POST`   | `/{mediaId}/share`                    | Generate share link                       | 200/hour   | No         |
| `DELETE` | `/{mediaId}/share`                    | Revoke share link                         | 200/hour   | Yes        |
| `GET`    | `/stats`                              | Storage usage statistics                  | 100/hour   | Yes        |

### 12.4 Admin Endpoints (Admin JWT Required)

| Method   | Endpoint                        | Description                       | Rate Limit | Idempotent |     | Role |
| :------- | :------------------------------ | :-------------------------------- | :--------- | :--------- | :-- | :--- |
| `GET`    | `/`                             | List all media                    | 2000/hour  | Yes        |
| `GET`    | `/{mediaId}`                    | Get media (admin view)            | 2000/hour  | Yes        |
| `GET`    | `/analytics`                    | Media analytics                   | 1000/hour  | Yes        |
| `DELETE` | `/{mediaId}`                    | Delete any media                  | 500/hour   | Yes        |
| `POST`   | `/{mediaId}/reprocess`          | Reprocess media                   | 100/hour   | No         |
| `GET`    | `/storage-usage`                | Storage usage stats               | 500/hour   | Yes        |
| `GET`    | `/quarantine`                   | List quarantined files            | 500/hour   | Yes        |
| `POST`   | `/quarantine/{mediaId}/release` | Release from quarantine           | 100/hour   | No         |
| `DELETE` | `/quarantine/{mediaId}`         | Delete quarantined file           | 100/hour   | Yes        |
| `POST`   | `/cleanup`                      | Trigger storage cleanup           | 10/hour    | No         |
| `GET`    | `/users/{userId}`               | List media for a specific user    | 1000/hour  | Yes        |
| `PATCH`  | `/settings`                     | Update media upload configuration | 100/hour   | No         |

### 12.5 Request/Response Examples

> **Note:** For brevity, `X-CSRF-Token` is omitted from state-changing examples unless specifically highlighted. It is only required when using cookie-based authentication. Rate limit headers are shown in the first example as a reference for all responses.

#### POST /upload/request (Presigned URL)

```json
// Request
POST /api/v1/media/upload/request
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "filename": "design-mockup.png",
  "contentType": "image/png",
  "size": 2456789,
  "context": "projectAttachment",
  "contextId": "projAbc123",
  "metadata": {
    "description": "Homepage design mockup v2",
    "tags": ["design", "homepage", "v2"]
  }
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
  "data": {
    "uploadId": "uplXyz789",
    "mediaId": "mediaAbc123",
    "presignedUrl": "https://s3.amazonaws.com/nestlancer-private/uploads/mediaAbc123?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...",
    "method": "PUT",
    "headers": {
      "Content-Type": "image/png",
      "x-amz-acl": "private",
      "x-amz-meta-upload-id": "uplXyz789"
    },
    "fields": {},
    "maxSize": 10485760,
    "expiresAt": "2024-02-18T11:30:00.000Z",
    "expiresIn": 3600
  },
  "metadata": {
    "timestamp": "2024-02-18T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}

// Client-side upload
const response = await fetch(presignedUrl, {
  method: 'PUT',
  headers: headers,
  body: file
});
```

#### POST /upload/confirm

```json
// Request
POST /api/v1/media/upload/confirm
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "uploadId": "uplXyz789",
  "checksum": "sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
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
  "message": "Upload confirmed. Processing started.",
  "data": {
    "id": "mediaAbc123",
    "filename": "design-mockup.png",
    "originalFilename": "design-mockup.png",
    "mimeType": "image/png",
    "size": 2456789,
    "sizeFormatted": "2.34 MB",
    "status": "processing",
    "processing": {
      "status": "inProgress",
      "steps": [
        { "name": "virusScan", "status": "completed" },
        { "name": "validation", "status": "completed" },
        { "name": "thumbnail", "status": "inProgress" },
        { "name": "optimization", "status": "pending" }
      ],
      "estimatedCompletionTime": "2024-02-18T10:31:00.000Z"
    },
    "urls": {
      "original": null,
      "thumbnail": null,
      "optimized": null
    },
    "visibility": "private",
    "context": {
      "type": "projectAttachment",
      "id": "projAbc123"
    },
    "metadata": {
      "description": "Homepage design mockup v2",
      "tags": ["design", "homepage", "v2"]
    },
    "createdAt": "2024-02-18T10:30:00.000Z",
    "updatedAt": "2024-02-18T10:30:30.000Z"
  },
  "metadata": {
    "timestamp": "2024-02-18T10:30:30.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}

// After processing completes (poll /status or receive webhook)
{
  "status": "success",
  "data": {
    "id": "mediaAbc123",
    "filename": "design-mockup.png",
    "status": "ready",
    "processing": {
      "status": "completed",
      "completedAt": "2024-02-18T10:31:00.000Z",
      "duration": 30
    },
    "urls": {
      "original": "https://api.yourdomain.com/v1/media/mediaAbc123/download?size=original",
      "thumbnail": "https://api.yourdomain.com/v1/media/mediaAbc123/download?size=thumbnail",
      "optimized": "https://api.yourdomain.com/v1/media/mediaAbc123/download?size=optimized",
      "sizes": {
        "small": "https://api.yourdomain.com/v1/media/mediaAbc123/download?size=small",
        "medium": "https://api.yourdomain.com/v1/media/mediaAbc123/download?size=medium",
        "large": "https://api.yourdomain.com/v1/media/mediaAbc123/download?size=large"
      }
    },
    "dimensions": {
      "width": 1920,
      "height": 1080
    }
  }
}
```

#### POST /upload (Direct Upload - Small Files)

```json
// Request
POST /api/v1/media/upload
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: multipart/form-data

------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="icon.png"
Content-Type: image/png

[Binary file data]
------WebKitFormBoundary
Content-Disposition: form-data; name="context"

projectAttachment
------WebKitFormBoundary
Content-Disposition: form-data; name="contextId"

projAbc123
------WebKitFormBoundary
Content-Disposition: form-data; name="description"

App icon design
------WebKitFormBoundary--

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
  "message": "File uploaded successfully",
  "data": {
    "id": "mediaDef456",
    "filename": "icon.png",
    "mimeType": "image/png",
    "size": 45678,
    "status": "ready",
    "urls": {
      "original": "https://api.yourdomain.com/v1/media/mediaDef456/download?size=original",
      "thumbnail": "https://api.yourdomain.com/v1/media/mediaDef456/download?size=thumbnail"
    },
    "visibility": "private",
    "createdAt": "2024-02-18T10:30:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-02-18T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### POST /upload/chunked/init (Large File Upload)

```json
// Request
POST /api/v1/media/upload/chunked/init
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "filename": "project-video.mp4",
  "contentType": "video/mp4",
  "size": 524288000,
  "totalChunks": 100,
  "chunkSize": 5242880,
  "context": "projectDeliverable",
  "contextId": "projAbc123"
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
  "data": {
    "uploadId": "chunkedUplXyz789",
    "mediaId": "mediaVideo123",
    "chunkSize": 5242880,
    "totalChunks": 100,
    "expiresAt": "2024-02-19T10:30:00.000Z",
    "uploadUrls": [
      {
        "partNumber": 1,
        "url": "https://s3.amazonaws.com/nestlancer-private/uploads/mediaVideo123/part1?...",
        "expiresAt": "2024-02-18T11:30:00.000Z"
      },
      {
        "partNumber": 2,
        "url": "https://s3.amazonaws.com/nestlancer-private/uploads/mediaVideo123/part2?...",
        "expiresAt": "2024-02-18T11:30:00.000Z"
      }
      // ... more URLs provided in batches
    ]
  },
  "metadata": {
    "timestamp": "2024-02-18T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### GET /{mediaId}

```json
// Request
GET /api/v1/media/mediaAbc123
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
    "id": "mediaAbc123",
    "filename": "design-mockup.png",
    "originalFilename": "design-mockup.png",
    "mimeType": "image/png",
    "size": 2456789,
    "sizeFormatted": "2.34 MB",
    "status": "ready",
    "type": "image",
    "visibility": "private",
    "urls": {
      "original": "https://api.yourdomain.com/v1/media/mediaAbc123/download?size=original",
      "thumbnail": "https://api.yourdomain.com/v1/media/mediaAbc123/download?size=thumbnail",
      "optimized": "https://api.yourdomain.com/v1/media/mediaAbc123/download?size=optimized",
      "sizes": {
        "small": {
          "url": "https://api.yourdomain.com/v1/media/mediaAbc123/download?size=small",
          "width": 320,
          "height": 180
        },
        "medium": {
          "url": "https://api.yourdomain.com/v1/media/mediaAbc123/download?size=medium",
          "width": 640,
          "height": 360
        },
        "large": {
          "url": "https://api.yourdomain.com/v1/media/mediaAbc123/download?size=large",
          "width": 1280,
          "height": 720
        }
      }
    },
    "dimensions": {
      "width": 1920,
      "height": 1080
    },
    "context": {
      "type": "projectAttachment",
      "id": "projAbc123",
      "name": "E-commerce Website"
    },
    "metadata": {
      "description": "Homepage design mockup v2",
      "tags": ["design", "homepage", "v2"],
      "alt": "Homepage design showing hero section",
      "exif": {
        "camera": null,
        "dateTaken": null
      }
    },
    "security": {
      "virusScanStatus": "clean",
      "scannedAt": "2024-02-18T10:30:15.000Z"
    },
    "share": {
      "enabled": false,
      "shareUrl": null,
      "expiresAt": null
    },
    "versions": [
      {
        "version": 1,
        "filename": "design-mockup.png",
        "size": 2456789,
        "createdAt": "2024-02-18T10:30:00.000Z",
        "current": true
      }
    ],
    "owner": {
      "id": "usrAbc123",
      "name": "John Doe"
    },
    "createdAt": "2024-02-18T10:30:00.000Z",
    "updatedAt": "2024-02-18T10:31:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-02-18T11:00:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### POST /{mediaId}/share

```json
// Request
POST /api/v1/media/mediaAbc123/share
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "expiresIn": 604800,
  "password": null,
  "maxDownloads": 10,
  "allowedEmails": ["client@example.com"]
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
  "message": "Share link created successfully",
  "data": {
    "shareId": "shareXyz789",
    "shareUrl": "https://yourdomain.com/share/shareXyz789",
    "shortUrl": "https://shr.yourdomain.com/xyz789",
    "passwordProtected": false,
    "expiresAt": "2024-02-25T10:30:00.000Z",
    "maxDownloads": 10,
    "downloadsRemaining": 10,
    "createdAt": "2024-02-18T10:30:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-02-18T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### GET /stats

```json
// Request
GET /api/v1/media/stats
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
    "storage": {
      "used": 1073741824,
      "usedFormatted": "1.00 GB",
      "limit": 10737418240,
      "limitFormatted": "10.00 GB",
      "percentage": 10,
      "remaining": 9663676416,
      "remainingFormatted": "9.00 GB"
    },
    "files": {
      "total": 156,
      "byType": {
        "image": 120,
        "document": 30,
        "video": 4,
        "archive": 2
      },
      "byStatus": {
        "ready": 150,
        "processing": 2,
        "failed": 4
      }
    },
    "bandwidth": {
      "used": 5368709120,
      "usedFormatted": "5.00 GB",
      "limit": 107374182400,
      "limitFormatted": "100.00 GB",
      "period": "monthly",
      "resetsAt": "2024-03-01T00:00:00.000Z"
    },
    "uploads": {
      "thisMonth": 45,
      "lastMonth": 38
    }
  },
  "metadata": {
    "timestamp": "2024-02-18T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### GET /admin/media/users/{userId}

```json
// Request
GET /api/v1/admin/media/users/usrAbc123?page=1&limit=20&type=image
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
      "id": "mediaAbc123",
      "filename": "design-mockup.png",
      "mimeType": "image/png",
      "size": 2456789,
      "sizeFormatted": "2.34 MB",
      "status": "ready",
      "type": "image",
      "visibility": "private",
      "urls": {
        "original": "https://api.yourdomain.com/v1/media/mediaAbc123/download?size=original",
        "thumbnail": "https://api.yourdomain.com/v1/media/mediaAbc123/download?size=thumbnail"
      },
      "createdAt": "2024-02-18T10:30:00.000Z",
      "updatedAt": "2024-02-18T10:31:00.000Z"
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
    "timestamp": "2024-02-18T11:00:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### PATCH /admin/media/settings

```json
// Request
PATCH /api/v1/admin/media/settings
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "maxFileSize": 52428800,
  "allowedMimeTypes": ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  "storageQuotaPerUser": 10737418240
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
  "message": "Media settings updated successfully",
  "data": {
    "maxFileSize": 52428800,
    "allowedMimeTypes": ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    "storageQuotaPerUser": 10737418240,
    "updatedAt": "2024-02-18T11:00:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-02-18T11:00:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

### 12.6 Error Codes

| Code        | HTTP Status | Description                          | Retryable |
| :---------- | :---------- | :----------------------------------- | :-------- |
| `MEDIA_001` | 404         | Media not found                      | No        |
| `MEDIA_002` | 403         | Unauthorized access                  | No        |
| `MEDIA_003` | 413         | File size exceeds limit              | No        |
| `MEDIA_004` | 415         | Unsupported file type                | No        |
| `MEDIA_005` | 500         | Upload failed                        | Yes       |
| `MEDIA_006` | 500         | Processing failed                    | Yes       |
| `MEDIA_007` | 410         | Presigned URL expired                | No        |
| `MEDIA_008` | 400         | Virus detected                       | No        |
| `MEDIA_009` | 507         | Storage quota exceeded               | No        |
| `MEDIA_010` | 422         | Invalid file content (type mismatch) | No        |
| `MEDIA_011` | 400         | Checksum mismatch                    | No        |
| `MEDIA_012` | 400         | Chunked upload incomplete            | No        |
| `MEDIA_013` | 404         | Upload session not found             | No        |
| `MEDIA_014` | 410         | Share link expired                   | No        |
| `MEDIA_015` | 429         | Download limit reached               | No        |

---
