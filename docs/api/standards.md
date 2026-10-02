<div align="center">

# API Standards Reference

</div>

---

## 1. API Standards

### 1.1 Base URL

```
Production: https://api.yourdomain.com/api/v1
Staging:    https://api-staging.yourdomain.com/api/v1
Development: http://localhost:8000/api/v1
```

### 1.2 Versioning

#### Version Strategy

- **Method**: Path-based versioning (`/api/v1/`, `/api/v2/`)
- **Current Version**: v1 (Full support)
- **Response Header**: `X-API-Version: v1`

#### Version Lifecycle Policy

| Stage          | Duration                   | Support Level                   |
| :------------- | :------------------------- | :------------------------------ |
| **Active**     | Indefinite                 | Full support, new features      |
| **Deprecated** | 12 months minimum          | Bug fixes only, no new features |
| **Sunset**     | 6 months after deprecation | No support, endpoint removal    |

#### Deprecation Headers

```
X-API-Deprecated: true
X-API-Sunset: 2025-06-15T00:00:00Z
X-API-Deprecated-Replacement: /api/v2/users/profile
Sunset: Sat, 15 Jun 2025 00:00:00 GMT
```

#### Version Timeline

| Version | Release Date | Deprecation Date | Sunset Date | Status  |
| :------ | :----------- | :--------------- | :---------- | :------ |
| v1      | 2024-01-15   | TBD              | TBD         | Active  |
| v2      | TBD          | -                | -           | Planned |

### 1.3 Authentication

#### Methods

```
Authorization: Bearer <jwtToken>
```

#### Token Types

| Token         | Lifetime   | Refresh | Usage                  |
| :------------ | :--------- | :------ | :--------------------- |
| Access Token  | 15 minutes | Yes     | API requests           |
| Refresh Token | 30 days    | No      | Token renewal          |
| API Key       | Permanent  | N/A     | Webhooks, integrations |

#### Security Requirements

- TLS 1.2 or higher required
- Tokens must be stored securely (httpOnly cookies recommended)
- API keys must use signature verification
- All production requests must use HTTPS

### 1.4 Common Headers

#### Request Headers

| Header            | Required                | Description           | Example            |
| :---------------- | :---------------------- | :-------------------- | :----------------- |
| `Content-Type`    | Yes (POST/PUT/PATCH)    | Media type            | `application/json` |
| `Accept`          | No                      | Response format       | `application/json` |
| `Authorization`   | For protected endpoints | Bearer token          | `Bearer eyJhbG...` |
| `X-Request-ID`    | Recommended             | Request tracing UUID  | `reqA1B2C3D4`      |
| `User-Agent`      | Recommended             | Client identification | `MyApp/1.0`        |
| `Accept-Language` | No                      | Preferred language    | `en-US,en;q=0.9`   |
| `Idempotency-Key` | Critical operations     | Prevent duplicates    | `idemUuid123`      |
| `X-CSRF-Token`    | State-changing ops      | CSRF protection       | `csrfToken123`     |

#### Response Headers

| Header                  | Always Present      | Description                       |
| :---------------------- | :------------------ | :-------------------------------- |
| `Content-Type`          | Yes                 | `application/json; charset=utf-8` |
| `X-API-Version`         | Yes                 | Current API version               |
| `X-Request-ID`          | Yes                 | Request trace ID                  |
| `X-RateLimit-Limit`     | Yes                 | Rate limit ceiling                |
| `X-RateLimit-Remaining` | Yes                 | Remaining requests                |
| `X-RateLimit-Reset`     | Yes                 | Reset timestamp (Unix)            |
| `Cache-Control`         | Yes                 | Caching directives                |
| `ETag`                  | Cacheable resources | Entity tag for caching            |
| `Last-Modified`         | Cacheable resources | Last modification time            |

### 1.5 Standard Response Format

**Note:** Health check endpoints (`/api/v1/health/*`) are exempt from this standard format. They return a simplified structure suitable for infrastructure monitoring tools. See `101-health-endpoints.md` for details.

#### Success Response (2xx)

```json
{
  "status": "success",
  "data": {
    "id": "usrAbc123",
    "email": "user@example.com"
  },
  "message": "Operation completed successfully",
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### Intermediate/Partial Response (2xx)

Used for multi-step operations that require further action (e.g., 2FA required).

```json
{
  "status": "partial",
  "message": "Two-factor authentication required",
  "data": {
    "requires2FA": true,
    "authSessionId": "sessAbc123"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### Error Response (4xx, 5xx)

```json
{
  "status": "error",
  "error": {
    "code": "AUTH_001",
    "message": "Invalid credentials provided",
    "details": {
      "field": "password",
      "reason": "Password does not match",
      "attemptRemaining": 3
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1",
    "documentation": "https://docs.yourdomain.com/errors/AUTH_001"
  }
}
```

#### Rate Limit Error (429)

```json
{
  "status": "error",
  "error": {
    "code": "GLOBAL_007",
    "message": "Rate limit exceeded",
    "details": {
      "limit": 100,
      "remaining": 0,
      "resetAt": "2024-01-15T11:00:00.000Z",
      "retryAfter": 3600
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### Validation Error (422)

```json
{
  "status": "error",
  "error": {
    "code": "GLOBAL_003",
    "message": "Validation failed",
    "details": {
      "errors": [
        {
          "field": "email",
          "message": "Invalid email format",
          "value": "invalid-email",
          "rule": "email"
        },
        {
          "field": "password",
          "message": "Password must be at least 8 characters",
          "value": "***",
          "rule": "minLength"
        }
      ]
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

#### Paginated Response

```json
{
  "status": "success",
  "data": [
    { "id": 1, "name": "Item 1" },
    { "id": 2, "name": "Item 2" }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123",
    "version": "v1"
  }
}
```

### 1.6 HTTP Status Codes

#### Success Codes (2xx)

| Code  | Meaning    | Usage                                |
| :---- | :--------- | :----------------------------------- |
| `200` | OK         | Successful GET, PATCH, DELETE        |
| `201` | Created    | Successful POST (resource created)   |
| `202` | Accepted   | Request accepted (async processing)  |
| `204` | No Content | Successful DELETE (no response body) |

#### Client Error Codes (4xx)

| Code  | Meaning                | Usage                           |
| :---- | :--------------------- | :------------------------------ |
| `400` | Bad Request            | Malformed request syntax        |
| `401` | Unauthorized           | Authentication required/failed  |
| `403` | Forbidden              | Authenticated but no permission |
| `404` | Not Found              | Resource doesn't exist          |
| `405` | Method Not Allowed     | HTTP method not supported       |
| `409` | Conflict               | Resource conflict (duplicate)   |
| `410` | Gone                   | Resource permanently deleted    |
| `413` | Payload Too Large      | Request body exceeds limit      |
| `415` | Unsupported Media Type | Invalid Content-Type            |
| `422` | Unprocessable Entity   | Validation failed               |
| `429` | Too Many Requests      | Rate limit exceeded             |

#### Server Error Codes (5xx)

| Code  | Meaning               | Usage                   |
| :---- | :-------------------- | :---------------------- |
| `500` | Internal Server Error | Unexpected server error |
| `502` | Bad Gateway           | Upstream service error  |
| `503` | Service Unavailable   | Temporary downtime      |
| `504` | Gateway Timeout       | Upstream timeout        |

### 1.7 Date/Time Format

#### Standard Format

- **Format**: ISO 8601 UTC
- **Pattern**: `YYYY-MM-DDTHH:mm:ss.SSSZ`
- **Timezone**: Always UTC (Z suffix)
- **Examples**:
  ```
  2024-01-15T14:30:00.000Z
  2024-12-31T23:59:59.999Z
  ```

#### Date-Only Format

- **Format**: `YYYY-MM-DD`
- **Example**: `2024-01-15`

#### Unix Timestamp (Headers Only)

- **Format**: Seconds since epoch
- **Example**: `1705323000`
- **Usage**: `X-RateLimit-Reset` header

### 1.8 Pagination

#### Standard Parameters

| Parameter | Type    | Default | Max  | Description             |
| :-------- | :------ | :------ | :--- | :---------------------- |
| `page`    | integer | 1       | 1000 | Page number (1-indexed) |
| `limit`   | integer | 20      | 100  | Items per page          |
| `sortBy`  | string  | varies  | -    | Field to sort by        |
| `order`   | string  | `desc`  | -    | `asc` or `desc`         |

#### Examples

```
GET /api/v1/users?page=1&limit=50
GET /api/v1/projects?page=2&limit=25&sortBy=createdAt&order=desc
```

#### Cursor-Based Pagination (Large Datasets)

Clients can use the `cursor` parameter to fetch the next page. The response provides `nextCursor` for forward navigation and `prevCursor` to navigate backward.

```json
// Request
GET /api/v1/messages?cursor=msgXyz789&limit=50

// Response
{
  "data": [...],
  "pagination": {
    "nextCursor": "msgAbc123",
    "prevCursor": "msgDef456",
    "hasNext": true,
    "hasPrev": true,
    "limit": 50
  }
}
```

### 1.9 Filtering & Search

#### Standard Filter Parameters

| Parameter     | Format | Description      | Example                   |
| :------------ | :----- | :--------------- | :------------------------ |
| `search`      | string | Full-text search | `?search=ecommerce`       |
| `q`           | string | Alias for search | `?q=website`              |
| `status`      | string | Comma-separated  | `?status=active,pending`  |
| `createdFrom` | date   | Start date       | `?createdFrom=2024-01-01` |
| `createdTo`   | date   | End date         | `?createdTo=2024-12-31`   |
| `updatedFrom` | date   | Update start     | `?updatedFrom=2024-01-01` |
| `updatedTo`   | date   | Update end       | `?updatedTo=2024-12-31`   |

#### Advanced Filtering (Admin)

```
GET /api/v1/admin/users?filter[role]=admin,manager
GET /api/v1/admin/projects?filter[budget][gte]=5000&filter[budget][lte]=10000
GET /api/v1/admin/payments?filter[status]=completed&filter[amount][gte]=1000
```

#### Filter Operators

| Operator     | Description      | Example                             |
| :----------- | :--------------- | :---------------------------------- |
| `eq`         | Equals (default) | `filter[status][eq]=active`         |
| `ne`         | Not equals       | `filter[status][ne]=cancelled`      |
| `gt`         | Greater than     | `filter[amount][gt]=1000`           |
| `gte`        | Greater or equal | `filter[amount][gte]=1000`          |
| `lt`         | Less than        | `filter[amount][lt]=5000`           |
| `lte`        | Less or equal    | `filter[amount][lte]=5000`          |
| `in`         | In array         | `filter[status][in]=active,pending` |
| `nin`        | Not in array     | `filter[status][nin]=cancelled`     |
| `contains`   | String contains  | `filter[name][contains]=john`       |
| `startsWith` | String starts    | `filter[email][startsWith]=admin`   |

### 1.10 Field Selection & Expansion

#### Field Selection (Sparse Fieldsets)

```
GET /api/v1/users/profile?fields=id,email,firstName,avatar
GET /api/v1/projects?fields=id,title,status,createdAt
```

#### Response

```json
{
  "status": "success",
  "data": {
    "id": "usrAbc123",
    "email": "user@example.com",
    "firstName": "John",
    "avatar": "https://..."
  }
}
```

#### Relationship Expansion

```
GET /api/v1/projects/{id}?expand=client,quote,payments
GET /api/v1/quotes/{id}?expand=request,project
```

#### Response

```json
{
  "status": "success",
  "data": {
    "id": "projAbc123",
    "title": "E-commerce Website",
    "client": {
      "id": "usrXyz789",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "quote": {
      "id": "quoteAbc123",
      "totalAmount": 8500
    }
  }
}
```

### 1.11 Input Validation Rules

#### Email

- **Format**: RFC 5322 compliant
- **Max Length**: 254 characters
- **Normalization**: Converted to lowercase
- **Example**: `user@example.com`
- **Regex**: `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`

#### Password

- **Min Length**: 8 characters
- **Max Length**: 128 characters
- **Requirements**:
  - At least 1 uppercase letter (A-Z)
  - At least 1 lowercase letter (a-z)
  - At least 1 number (0-9)
  - At least 1 special character (!@#$%^&\*()\_+-=[]{}|;:,.<>?)
- **Not Allowed**: Common passwords, sequential characters
- **Example**: `SecureP@ss123!`

#### Phone Number

- **Format**: E.164 international format
- **Pattern**: `+[country code][number]`
- **Example**: `+14155552671`, `+919876543210`
- **Regex**: `^\+[1-9]\d{1,14}$`
- **Min Length**: 8 digits (after country code)
- **Max Length**: 15 digits (total)

#### URL

- **Format**: Valid HTTP/HTTPS URL
- **Max Length**: 2048 characters
- **Allowed Protocols**: `http://`, `https://`
- **Example**: `https://example.com/path`

#### Slug

- **Format**: Lowercase alphanumeric with hyphens
- **Min Length**: 3 characters
- **Max Length**: 100 characters
- **Pattern**: `^[a-z0-9]+(?:-[a-z0-9]+)*$`
- **Example**: `my-awesome-project`

#### UUID

- **Format**: UUID v7
- **Pattern**: `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`
- **Example**: `550e8400-e29b-41d4-a716-446655440000`

#### File Upload

- **Max Filename Length**: 255 characters
- **Allowed Characters**: Alphanumeric, hyphens, underscores, dots
- **Virus Scanning**: Required (ClamAV)
- **Content Validation**: MIME type verification against actual content

#### Text Fields

| Field Type        | Min Length | Max Length | Allowed Characters                    |
| :---------------- | :--------- | :--------- | :------------------------------------ |
| First Name        | 1          | 50         | Letters, spaces, hyphens, apostrophes |
| Last Name         | 1          | 50         | Letters, spaces, hyphens, apostrophes |
| Short Description | 10         | 500        | Any (sanitized HTML)                  |
| Long Description  | 50         | 10000      | Any (sanitized HTML)                  |
| Message           | 10         | 5000       | Any (sanitized HTML)                  |

#### Numeric Fields

| Field      | Min  | Max          | Decimals | Currency |
| :--------- | :--- | :----------- | :------- | :------- |
| Amount     | 0.01 | 999999999.99 | 2        | See 1.12 |
| Percentage | 0    | 100          | 2        | N/A      |
| Quantity   | 1    | 999999       | 0        | N/A      |

### 1.12 Currency & Money Handling

#### Supported Currencies

| Currency      | Code | Symbol | Decimal Places | Min Amount |
| :------------ | :--- | :----- | :------------- | :--------- |
| Indian Rupee  | INR  | ₹      | 2              | 0.01       |
| Indian Rupee  | INR  | ₹      | 2              | 1.00       |
| Euro          | EUR  | €      | 2              | 0.01       |
| British Pound | GBP  | £      | 2              | 0.01       |

#### Default Currency

- **Default**: `INR`
- **User Override**: Based on `country` in profile
- **Detection**: IP-based geolocation (fallback to INR)

#### Amount Format

- **Storage**: Integer (smallest unit - cents/paise)
- **API**: Integer (consistent with storage)
- **Display**: Formatted string with symbol (client-side)

#### Examples

```json
{
  "amount": 1000, // ₹10.00
  "currency": "INR"
}

// Display formatting (client-side)
// INR: "₹10.00"
// INR: "₹10.00"
// EUR: "€10.00"
// GBP: "£10.00"
```

#### Conversion

- **Real-time Rates**: Updated hourly
- **Provider**: Open Exchange Rates API
- **Rounding**: Standard banker's rounding (half to even)

### 1.13 CORS Policy

#### Allowed Origins

```
Production: https://yourdomain.com, https://www.yourdomain.com
Staging:    https://staging.yourdomain.com
Development: http://localhost:3000, http://localhost:3001
```

#### CORS Headers

```
Access-Control-Allow-Origin: <origin>
Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Request-ID, X-CSRF-Token
Access-Control-Expose-Headers: X-API-Version, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Request-ID
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
```

#### Preflight Requests

```
OPTIONS /api/v1/users/profile
Response: 204 No Content (with CORS headers)
```

### 1.14 Idempotency

#### Idempotency Key

- **Header**: `Idempotency-Key`
- **Format**: UUID v7
- **Retention**: 24 hours
- **Scope**: Per user + endpoint

#### Idempotent Endpoints

| Endpoint                      | Idempotent | Key Required |
| :---------------------------- | :--------- | :----------- |
| `POST /payments/initiate`     | Yes        | Yes          |
| `POST /quotes/{id}/accept`    | Yes        | Yes          |
| `POST /projects/{id}/approve` | Yes        | Yes          |
| `POST /requests/{id}/submit`  | Yes        | Yes          |
| `POST /payments/confirm`      | Yes        | Yes          |

#### Example

```
POST /api/v1/payments/initiate
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json
Authorization: Bearer eyJhbG...

{
  "projectId": "projAbc123",
  "amount": 2550
}
```

#### Duplicate Request Response

```
HTTP/1.1 200 OK
X-Idempotency-Replayed: true

{
  "status": "success",
  "data": {
    "paymentId": "pmtXyz789",
    "status": "completed"
  }
}
```

### 1.15 Rate Limiting

#### Rate Limit Tiers

| Tier      | Requests/Hour | Burst   | Cost       |
| :-------- | :------------ | :------ | :--------- |
| Anonymous | 100           | 10/min  | Free       |
| Free User | 1000          | 30/min  | Free       |
| Paid User | 5000          | 100/min | Paid       |
| Admin     | 10000         | 200/min | N/A        |
| API Key   | Custom        | Custom  | Enterprise |

#### Tier Detection Logic

Rate limit tiers are automatically detected by the rate limiter middleware based on the authentication context:

- Requests lacking an `Authorization` header fall into the **Anonymous** tier.
- Requests with a validated user JWT are assigned the **Free User** or **Paid User** tier based on the user's subscription status in the token payload.
- Requests with an admin JWT are placed in the **Admin** tier.
- Requests authenticated via the API Key mechanism (e.g., via `api-key.guard.ts`) are assigned custom limits based on the specific key's configuration.

#### Rate Limit Headers (Always Present)

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1705323000
X-RateLimit-Tier: freeUser
```

#### Rate Limit Exceeded Response

```json
HTTP/1.1 429 Too Many Requests
Retry-After: 3600
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705323000

{
  "status": "error",
  "error": {
    "code": "GLOBAL_007",
    "message": "Rate limit exceeded",
    "details": {
      "limit": 1000,
      "remaining": 0,
      "resetAt": "2024-01-15T11:00:00.000Z",
      "retryAfter": 3600
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "reqAbc123"
  }
}
```

#### Endpoint-Specific Rate Limits

Higher-risk endpoints have stricter limits (see individual endpoint documentation).

### 1.16 Caching

#### Cacheable Endpoints

| Endpoint Pattern    | Cache Duration | Validation |
| :------------------ | :------------- | :--------- |
| `GET /portfolio/*`  | 1 hour         | ETag       |
| `GET /blog/posts/*` | 15 minutes     | ETag       |
| `GET /media/{id}`   | 24 hours       | ETag       |
| `GET /health`       | None           | N/A        |

#### Cache Headers

```
Cache-Control: public, max-age=3600, must-revalidate
ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"
Last-Modified: Mon, 15 Jan 2024 10:30:00 GMT
```

#### Conditional Requests

```
GET /api/v1/portfolio/public/portAbc123
If-None-Match: "33a64df551425fcc55e4d42a148795d9f25f89d4"

Response: 304 Not Modified (if unchanged)
```

### 1.17 Webhook Security

#### Signature Verification

All webhook payloads include a signature header for verification.

#### Razorpay Webhooks

```
POST /api/v1/webhooks/razorpay
X-Razorpay-Signature: 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08

// Verification (Node.js example)
const crypto = require('crypto');

function verifyRazorpaySignature(body, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

#### Custom Webhooks (Admin-configured)

```
X-Webhook-Signature: sha256=5f7a...
X-Webhook-ID: whkAbc123
X-Webhook-Timestamp: 1705323000

// Verification
const payload = `${timestamp}.${JSON.stringify(body)}`;
const expectedSignature = crypto
  .createHmac('sha256', webhookSecret)
  .update(payload)
  .digest('hex');
```

#### Webhook Retry Policy

| Attempt | Delay      | Total Time |
| :------ | :--------- | :--------- |
| 1       | Immediate  | 0s         |
| 2       | 1 minute   | 1m         |
| 3       | 5 minutes  | 6m         |
| 4       | 30 minutes | 36m        |
| 5       | 2 hours    | 2h 36m     |
| 6       | 6 hours    | 8h 36m     |

After 6 failed attempts, webhook is marked as failed and requires manual retry.

### 1.18 CSRF Protection

#### State-Changing Operations

All state-changing operations (POST, PATCH, DELETE) require CSRF token validation when using cookie-based authentication.

#### CSRF Token Acquisition

```
GET /api/v1/auth/csrf-token

Response:
{
  "status": "success",
  "data": {
    "csrfToken": "csrfAbc123Xyz789",
    "expiresAt": "2024-01-15T11:30:00.000Z"
  }
}
```

#### Usage

```
POST /api/v1/users/profile
X-CSRF-Token: csrfAbc123Xyz789
Content-Type: application/json
Cookie: session=sessXyz789

{
  "firstName": "John"
}
```

#### Exempt Endpoints

- All GET, HEAD, OPTIONS requests
- Bearer token authentication (not cookie-based)
- Webhook endpoints (use signature verification)

---
