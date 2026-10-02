<div align="center">

# SDK Reference

</div>

---

## 📖 Table of Contents

- [21. SDK Reference](#21-sdk-reference)
- [Appendix: Quick Reference](#appendix-quick-reference)
- [Document Information](#document-information)
- [Support & Resources](#support-resources)

---

## 21. SDK Reference

### 21.1 Official SDKs

#### JavaScript/TypeScript SDK

```bash
# Installation
npm install @yourdomain/api-client

# or
yarn add @yourdomain/api-client
```

```typescript
import { ApiClient, AuthService, ProjectsService } from '@yourdomain/api-client';

// Initialize client
const client = new ApiClient({
  baseUrl: 'https://api.yourdomain.com/api/v1',
  timeout: 30000,
});

// Authentication
const auth = new AuthService(client);
const { accessToken, refreshToken, user } = await auth.login({
  email: 'user@example.com',
  password: 'password123',
});

// Set token
client.setToken(accessToken);

// Use services
const projects = new ProjectsService(client);

// List projects
const projectList = await projects.list({
  page: 1,
  limit: 20,
  status: 'inProgress',
});

// Get project details
const project = await projects.get('projAbc123');

// Create project request
const request = await client.requests.create({
  title: 'New Website',
  description: 'Need a modern website',
  category: 'webDevelopment',
  budget: { min: 5000, max: 10000, currency: 'INR' },
});

// Upload file
const media = await client.media.upload(file, {
  context: 'projectAttachment',
  contextId: 'projAbc123',
});

// Real-time notifications
client.notifications.onNew((notification) => {
  console.log('New notification:', notification);
});

// WebSocket messages
client.messages.connect('projAbc123');
client.messages.onMessage((message) => {
  console.log('New message:', message);
});
client.messages.send('projAbc123', {
  content: 'Hello!',
  attachments: [],
});
```

#### TypeScript Types

```typescript
// All types are exported
import type {
  User,
  Project,
  Quote,
  Payment,
  Message,
  Notification,
  PaginatedResponse,
  ApiError,
} from '@yourdomain/api-client';

// Example usage
const handleProject = (project: Project) => {
  console.log(project.id, project.title, project.status);
};
```

---

#### Python SDK

```bash
# Installation
pip install yourdomain-api

# or
poetry add yourdomain-api
```

```python
from yourdomainApi import ApiClient, AuthService, ProjectsService

# Initialize client
client = ApiClient(
    baseUrl="https://api.yourdomain.com/api/v1",
    timeout=30
)

# Authentication
auth = AuthService(client)
result = auth.login(
    email="user@example.com",
    password="password123"
)

# Set token
client.setToken(result.accessToken)

# Use services
projects = ProjectsService(client)

# List projects
projectList = projects.list(
    page=1,
    limit=20,
    status="inProgress"
)

# Get project details
project = projects.get("projAbc123")

# Create request
request = client.requests.create(
    title="New Website",
    description="Need a modern website",
    category="webDevelopment",
    budget={"min": 5000, "max": 10000, "currency": "INR"}
)

# Async support
import asyncio

async def main():
    async with ApiClient(baseUrl="...") as client:
        projects = await client.projects.listAsync()
        print(projects)

asyncio.run(main())
```

---

#### PHP SDK

```bash
# Installation
composer require yourdomain/api-client
```

```php
<?php

use YourDomain\ApiClient;
use YourDomain\Services\AuthService;
use YourDomain\Services\ProjectsService;

// Initialize client
$client = new ApiClient([
    'baseUrl' => 'https://api.yourdomain.com/api/v1',
    'timeout' => 30
]);

// Authentication
$auth = new AuthService($client);
$result = $auth->login([
    'email' => 'user@example.com',
    'password' => 'password123'
]);

// Set token
$client->setToken($result->accessToken);

// Use services
$projects = new ProjectsService($client);

// List projects
$projectList = $projects->list([
    'page' => 1,
    'limit' => 20,
    'status' => 'inProgress'
]);

// Get project details
$project = $projects->get('projAbc123');

// Create request
$request = $client->requests()->create([
    'title' => 'New Website',
    'description' => 'Need a modern website',
    'category' => 'webDevelopment',
    'budget' => ['min' => 5000, 'max' => 10000, 'currency' => 'INR']
]);
```

---

### 21.2 Community SDKs

| Language | Repository                       | Maintainer |
| :------- | :------------------------------- | :--------- |
| Go       | github.com/yourdomain/go-sdk     | Community  |
| Ruby     | github.com/yourdomain/ruby-sdk   | Community  |
| Java     | github.com/yourdomain/java-sdk   | Community  |
| C#       | github.com/yourdomain/dotnet-sdk | Community  |
| Swift    | github.com/yourdomain/swift-sdk  | Community  |
| Kotlin   | github.com/yourdomain/kotlin-sdk | Community  |

---

### 21.3 API Client Configuration

#### Configuration Options

| Option           | Type     | Default  | Description              |
| :--------------- | :------- | :------- | :----------------------- |
| `baseUrl`        | string   | Required | API base URL             |
| `timeout`        | number   | 30000    | Request timeout (ms)     |
| `retries`        | number   | 3        | Max retry attempts       |
| `retryDelay`     | number   | 1000     | Initial retry delay (ms) |
| `token`          | string   | null     | Bearer token             |
| `onTokenRefresh` | function | null     | Token refresh callback   |
| `onError`        | function | null     | Global error handler     |
| `debug`          | boolean  | false    | Enable debug logging     |

#### Example Configuration

```javascript
const client = new ApiClient({
  baseUrl: 'https://api.yourdomain.com/api/v1',
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
  debug: process.env.NODE_ENV !== 'production',

  onTokenRefresh: async (refreshToken) => {
    const response = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    return response.json();
  },

  onError: (error) => {
    // Log to error tracking service
    errorTracker.capture(error);
  },
});
```

---

### 21.4 Webhook SDK

#### Webhook Verification

```javascript
import { WebhookValidator } from '@yourdomain/api-client';

const validator = new WebhookValidator(process.env.WEBHOOK_SECRET);

// Express middleware
app.post('/webhooks/yourdomain', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];

  if (!validator.verify(req.body, signature, timestamp)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = req.body;

  switch (event.type) {
    case 'project.created':
      handleProjectCreated(event.data);
      break;
    case 'payment.completed':
      handlePaymentCompleted(event.data);
      break;
    default:
      console.log('Unknown event type:', event.type);
  }

  res.status(200).json({ received: true });
});
```

```python
from yourdomainApi import WebhookValidator

validator = WebhookValidator(os.environ['WEBHOOK_SECRET'])

@app.route('/webhooks/yourdomain', methods=['POST'])
def handleWebhook():
    signature = request.headers.get('X-Webhook-Signature')
    timestamp = request.headers.get('X-Webhook-Timestamp')

    if not validator.verify(request.data, signature, timestamp):
        return jsonify({'error': 'Invalid signature'}), 401

    event = request.json

    if event['type'] == 'project.created':
        handleProjectCreated(event['data'])
    elif event['type'] == 'payment.completed':
        handlePaymentCompleted(event['data'])

    return jsonify({'received': True}), 200
```

---

## Appendix: Quick Reference

### A.1 Total Endpoint Count by Service

| Service       | Public | User    | Admin   | Total   |
| :------------ | :----- | :------ | :------ | :------ |
| Health        | 15     | 0       | 1       | 16      |
| Auth          | 8      | 3       | 0       | 11      |
| Users         | 0      | 21      | 18      | 39      |
| Requests      | 0      | 12      | 9       | 21      |
| Quotes        | 0      | 7       | 11      | 18      |
| Projects      | 2      | 12      | 12      | 26      |
| Progress      | 0      | 9       | 13      | 22      |
| Payments      | 0      | 15      | 17      | 33      |
| Messages      | 0      | 13      | 6       | 19      |
| Notifications | 0      | 16      | 11      | 27      |
| Media         | 0      | 18      | 10      | 28      |
| Portfolio     | 7      | 0       | 19      | 26      |
| Blog          | 13     | 13      | 30      | 56      |
| Contact       | 1      | 0       | 30      | 31      |
| Admin         | 0      | 0       | 55      | 55      |
| **Total**     | **46** | **139** | **242** | **428** |

### A.2 WebSocket Endpoints

| Service       | Endpoint                                    | Purpose                 |
| :------------ | :------------------------------------------ | :---------------------- |
| Messages      | `wss://api.yourdomain.com/ws/messages`      | Real-time messaging     |
| Notifications | `wss://api.yourdomain.com/ws/notifications` | Real-time notifications |

### A.3 Webhook Endpoints (Inbound)

| Provider | Endpoint                                  | Purpose        |
| :------- | :---------------------------------------- | :------------- |
| Razorpay | `POST /api/v1/payments/webhooks/razorpay` | Payment events |

### A.4 Rate Limit Quick Reference

| Tier      | Requests/Hour | Burst/Minute |
| :-------- | :------------ | :----------- |
| Anonymous | 100           | 10           |
| Free User | 1,000         | 30           |
| Paid User | 5,000         | 100          |
| Admin     | 10,000        | 200          |

### A.5 HTTP Status Code Quick Reference

| Code | Meaning           | Common Cause          |
| :--- | :---------------- | :-------------------- |
| 200  | OK                | Success               |
| 201  | Created           | Resource created      |
| 204  | No Content        | Successful delete     |
| 400  | Bad Request       | Invalid input         |
| 401  | Unauthorized      | Missing/invalid token |
| 403  | Forbidden         | No permission         |
| 404  | Not Found         | Resource missing      |
| 409  | Conflict          | Duplicate/conflict    |
| 422  | Unprocessable     | Validation failed     |
| 429  | Too Many Requests | Rate limited          |
| 500  | Server Error      | Bug/outage            |

### A.6 Common Headers Quick Reference

#### Request Headers

```
Authorization: Bearer <token>
Content-Type: application/json
Accept: application/json
X-Request-ID: <uuid>
Idempotency-Key: <uuid>
X-CSRF-Token: <token>
```

#### Response Headers

```
Content-Type: application/json; charset=utf-8
X-API-Version: v1
X-Request-ID: <uuid>
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1705323000
```

---

## Document Information

| Property              | Value                           |
| :-------------------- | :------------------------------ |
| **Document Version**  | 1.1                             |
| **API Version**       | v1                              |
| **Last Updated**      | 2024-02-18                      |
| **Total Endpoints**   | 428                             |
| **Total Error Codes** | 150+                            |
| **Maintainer**        | Admin                           |
| **Contact**           | api-support@yourdomain.com      |
| **Documentation URL** | https://docs.yourdomain.com/api |
| **Status Page**       | https://status.yourdomain.com   |

---

## Support & Resources

### Getting Help

- **Documentation**: https://docs.yourdomain.com
- **API Status**: https://status.yourdomain.com
- **Support Email**: api-support@yourdomain.com
- **Developer Discord**: https://discord.gg/yourdomain

### Reporting Issues

- **Bug Reports**: https://github.com/yourdomain/api/issues
- **Security Issues**: security@yourdomain.com (use PGP)

### Stay Updated

- **Changelog RSS**: https://docs.yourdomain.com/changelog.rss
- **Twitter**: @yourdomainapi
- **Blog**: https://blog.yourdomain.com/engineering

---

_End of Complete API Endpoints Reference v1.1_
