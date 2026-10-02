<div align="center">

# Error Codes & Recovery Reference

</div>

---

## 18. Error Codes Reference

### 18.1 Global Error Codes (All Services)

| Code         | HTTP Status | Description                            | Retryable  |
| :----------- | :---------- | :------------------------------------- | :--------- |
| `GLOBAL_001` | 400         | Invalid request format                 | No         |
| `GLOBAL_002` | 422         | Missing required field                 | No         |
| `GLOBAL_003` | 422         | Invalid field value                    | No         |
| `GLOBAL_004` | 404         | Resource not found                     | No         |
| `GLOBAL_005` | 401         | Unauthorized - authentication required | No         |
| `GLOBAL_006` | 403         | Forbidden - insufficient permissions   | No         |
| `GLOBAL_007` | 429         | Rate limit exceeded                    | Yes (wait) |
| `GLOBAL_008` | 503         | Service temporarily unavailable        | Yes        |
| `GLOBAL_009` | 500         | Internal server error                  | Yes        |
| `GLOBAL_010` | 422         | Invalid pagination parameters          | No         |
| `GLOBAL_011` | 400         | Invalid date format                    | No         |
| `GLOBAL_012` | 400         | Invalid UUID format                    | No         |
| `GLOBAL_013` | 409         | Resource conflict                      | No         |
| `GLOBAL_014` | 410         | Resource gone (deleted)                | No         |
| `GLOBAL_015` | 413         | Request payload too large              | No         |
| `GLOBAL_016` | 415         | Unsupported media type                 | No         |
| `GLOBAL_017` | 400         | Invalid JSON                           | No         |
| `GLOBAL_018` | 400         | Missing required header                | No         |
| `GLOBAL_019` | 400         | Invalid query parameter                | No         |
| `GLOBAL_020` | 504         | Gateway timeout                        | Yes        |

### 18.2 Service-Specific Error Code Ranges

| Service        | Code Range                    | Example                        |
| :------------- | :---------------------------- | :----------------------------- |
| Authentication | AUTH_001 - AUTH_099           | AUTH_001: Invalid credentials  |
| Users          | USER_001 - USER_099           | USER_001: User not found       |
| Requests       | REQUEST_001 - REQUEST_099     | REQUEST_001: Request not found |
| Quotes         | QUOTE_001 - QUOTE_099         | QUOTE_001: Quote not found     |
| Projects       | PROJECT_001 - PROJECT_099     | PROJECT_001: Project not found |
| Progress       | PROGRESS_001 - PROGRESS_099   | PROGRESS_001: Entry not found  |
| Payments       | PAYMENT_001 - PAYMENT_099     | PAYMENT_001: Payment not found |
| Messages       | MSG_001 - MSG_099             | MSG_001: Message not found     |
| Notifications  | NOTIF_001 - NOTIF_099         | NOTIF_001: Not found           |
| Media          | MEDIA_001 - MEDIA_099         | MEDIA_001: Media not found     |
| Portfolio      | PORTFOLIO_001 - PORTFOLIO_099 | PORTFOLIO_001: Item not found  |
| Blog           | BLOG_001 - BLOG_099           | BLOG_001: Post not found       |
| Contact        | CONTACT_001 - CONTACT_099     | CONTACT_001: Message not found |
| Admin          | ADMIN_001 - ADMIN_099         | ADMIN_001: Access required     |
| Webhooks       | WHK_001 - WHK_099             | WHK_001: Webhook not found     |

### 18.3 Complete Error Code Reference

See individual service sections for complete error code listings.

---

## 19. Error Recovery & Best Practices

### 19.1 Retry Strategy

#### Exponential Backoff

```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.ok) {
        return response.json();
      }

      // Don't retry client errors (4xx) except 429
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        const error = await response.json();
        throw new ApiError(error);
      }

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || 60;
        await sleep(retryAfter * 1000);
        continue;
      }

      // Retry server errors (5xx)
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 32000);
        await sleep(delay);
        continue;
      }

      throw new Error(`Request failed after ${maxRetries} retries`);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = Math.min(1000 * Math.pow(2, attempt), 32000);
      await sleep(delay);
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

#### Retry Guidelines

| Status Code   | Retry | Strategy                    |
| :------------ | :---- | :-------------------------- |
| 400-428       | No    | Fix request and resubmit    |
| 429           | Yes   | Wait for Retry-After header |
| 500           | Yes   | Exponential backoff         |
| 502           | Yes   | Exponential backoff         |
| 503           | Yes   | Exponential backoff         |
| 504           | Yes   | Exponential backoff         |
| Network Error | Yes   | Exponential backoff         |

### 19.2 Idempotency

#### Using Idempotency Keys

```javascript
// Generate idempotency key (client-side)
function generateIdempotencyKey() {
  return `idem_${generateUuid() from @nestlancer/common (UUID v7)}`;
}

// Making idempotent request
async function createPayment(paymentData) {
  const idempotencyKey = generateIdempotencyKey();

  // Store key locally for potential retries
  localStorage.setItem('lastPaymentKey', idempotencyKey);

  const response = await fetch('/api/v1/payments/initiate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Idempotency-Key': idempotencyKey
    },
    body: JSON.stringify(paymentData)
  });

  // Check if this was a replayed response
  if (response.headers.get('X-Idempotency-Replayed') === 'true') {
    console.log('This was a duplicate request - original response returned');
  }

  return response.json();
}
```

#### Idempotency Key Requirements

| Requirement | Description                       |
| :---------- | :-------------------------------- |
| Format      | UUID v7 or similar unique string  |
| Length      | 36-64 characters                  |
| Retention   | 24 hours on server                |
| Scope       | Per user + per endpoint           |
| Storage     | Server-side with response caching |

#### Endpoints Requiring Idempotency Keys

| Endpoint                        | Purpose                     |
| :------------------------------ | :-------------------------- |
| `POST /payments/initiate`       | Prevent duplicate charges   |
| `POST /payments/confirm`        | Prevent double confirmation |
| `POST /quotes/{id}/accept`      | Prevent double acceptance   |
| `POST /projects/{id}/approve`   | Prevent double approval     |
| `POST /requests/{id}/submit`    | Prevent double submission   |
| `POST /milestones/{id}/release` | Prevent double release      |

### 19.3 Circuit Breaker Pattern

#### Implementation Example

```javascript
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 30000;

    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
  }

  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.successThreshold) {
        this.state = 'CLOSED';
        this.failures = 0;
        this.successes = 0;
      }
    } else {
      this.failures = 0;
    }
  }

  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}

// Usage
const apiCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000,
});

async function fetchProjects() {
  return apiCircuitBreaker.call(async () => {
    const response = await fetch('/api/v1/projects');
    if (!response.ok) throw new Error('Request failed');
    return response.json();
  });
}
```

#### Circuit Breaker States

| State     | Description               | Behavior                 |
| :-------- | :------------------------ | :----------------------- |
| CLOSED    | Normal operation          | Requests pass through    |
| OPEN      | Failure threshold reached | Requests fail fast       |
| HALF_OPEN | Testing recovery          | Limited requests allowed |

### 19.4 Request Timeout Handling

```javascript
async function fetchWithTimeout(url, options = {}, timeout = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

// Recommended timeouts by operation type
const TIMEOUTS = {
  read: 10000, // GET requests
  write: 30000, // POST/PATCH/DELETE
  upload: 120000, // File uploads
  download: 60000, // File downloads
  payment: 45000, // Payment operations
};
```

### 19.5 Error Handling Best Practices

```javascript
class ApiClient {
  constructor(baseUrl, options = {}) {
    this.baseUrl = baseUrl;
    this.token = options.token;
    this.onUnauthorized = options.onUnauthorized || (() => {});
    this.onError = options.onError || console.error;
  }

  async request(method, path, data = null, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Request-ID': this.generateRequestId(),
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    const config = {
      method,
      headers,
      ...(data && { body: JSON.stringify(data) }),
    };

    try {
      const response = await fetchWithTimeout(url, config, options.timeout);

      // Handle different status codes
      if (response.status === 204) {
        return { status: 'success', data: null };
      }

      const result = await response.json();

      if (!response.ok) {
        return this.handleErrorResponse(response.status, result);
      }

      return result;
    } catch (error) {
      return this.handleNetworkError(error);
    }
  }

  handleErrorResponse(status, result) {
    const error = result.error || result;

    switch (status) {
      case 401:
        this.onUnauthorized();
        break;
      case 403:
        // Log forbidden access attempts
        console.warn('Access forbidden:', error);
        break;
      case 422:
        // Validation errors - return structured format
        return {
          status: 'error',
          validationErrors: error.details?.errors || [],
          message: error.message,
        };
      case 429:
        // Rate limited - calculate retry time
        const retryAfter = error.details?.retryAfter || 60;
        return {
          status: 'error',
          code: 'RATE_LIMITED',
          retryAfter,
          message: `Rate limited. Retry after ${retryAfter} seconds`,
        };
      default:
        this.onError(error);
    }

    throw new ApiError(error.code, error.message, error.details);
  }

  handleNetworkError(error) {
    if (error.message.includes('timeout')) {
      throw new ApiError('NETWORK_TIMEOUT', 'Request timed out', {
        retryable: true,
      });
    }

    if (!navigator.onLine) {
      throw new ApiError('NETWORK_OFFLINE', 'No internet connection', {
        retryable: true,
      });
    }

    throw new ApiError('NETWORK_ERROR', error.message, {
      retryable: true,
    });
  }

  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Convenience methods
  get(path, options) {
    return this.request('GET', path, null, options);
  }

  post(path, data, options) {
    return this.request('POST', path, data, options);
  }

  patch(path, data, options) {
    return this.request('PATCH', path, data, options);
  }

  delete(path, options) {
    return this.request('DELETE', path, null, options);
  }
}

class ApiError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
    this.retryable = details.retryable || false;
  }
}
```

### 19.6 Caching Strategies

```javascript
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.etags = new Map();
  }

  // Cache key generation
  getCacheKey(method, url, params) {
    const paramString = params ? JSON.stringify(params) : '';
    return `${method}:${url}:${paramString}`;
  }

  // Get cached response
  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  // Set cache with TTL
  set(key, data, ttl = 300000) {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
    });
  }

  // Set ETag for conditional requests
  setETag(url, etag) {
    this.etags.set(url, etag);
  }

  getETag(url) {
    return this.etags.get(url);
  }

  // Clear cache
  clear(pattern = null) {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

// Usage with conditional requests
async function fetchWithCache(url, options = {}) {
  const cacheManager = new CacheManager();
  const cacheKey = cacheManager.getCacheKey('GET', url);

  // Check cache first
  const cached = cacheManager.get(cacheKey);
  if (cached && !options.forceRefresh) {
    return cached;
  }

  // Add ETag header if available
  const etag = cacheManager.getETag(url);
  if (etag) {
    options.headers = {
      ...options.headers,
      'If-None-Match': etag,
    };
  }

  const response = await fetch(url, options);

  // Handle 304 Not Modified
  if (response.status === 304) {
    return cached;
  }

  // Store new ETag
  const newEtag = response.headers.get('ETag');
  if (newEtag) {
    cacheManager.setETag(url, newEtag);
  }

  // Cache response based on Cache-Control header
  const cacheControl = response.headers.get('Cache-Control');
  const data = await response.json();

  if (cacheControl && !cacheControl.includes('no-store')) {
    const maxAge = parseInt(cacheControl.match(/max-age=(\d+)/)?.[1] || 300);
    cacheManager.set(cacheKey, data, maxAge * 1000);
  }

  return data;
}
```

### 19.7 Offline Support

```javascript
class OfflineQueue {
  constructor() {
    this.queue = this.loadQueue();
    this.isOnline = navigator.onLine;

    window.addEventListener('online', () => this.processQueue());
    window.addEventListener('offline', () => this.isOnline = false);
  }

  loadQueue() {
    const stored = localStorage.getItem('offlineQueue');
    return stored ? JSON.parse(stored) : [];
  }

  saveQueue() {
    localStorage.setItem('offlineQueue', JSON.stringify(this.queue));
  }

  add(request) {
    this.queue.push({
      id: generateUuid() from @nestlancer/common (UUID v7),
      timestamp: Date.now(),
      ...request
    });
    this.saveQueue();
  }

  async processQueue() {
    this.isOnline = true;

    while (this.queue.length > 0 && this.isOnline) {
      const request = this.queue[0];

      try {
        await this.executeRequest(request);
        this.queue.shift();
        this.saveQueue();
      } catch (error) {
        if (!navigator.onLine) {
          break;
        }
        // Handle permanent failures
        if (!error.retryable) {
          this.queue.shift();
          this.saveQueue();
        }
      }
    }
  }

  async executeRequest(request) {
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.code, error.message);
    }

    return response.json();
  }
}

// Usage
const offlineQueue = new OfflineQueue();

async function sendMessage(projectId, content) {
  const request = {
    url: `/api/v1/messages/projects/${projectId}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ content })
  };

  if (!navigator.onLine) {
    offlineQueue.add(request);
    return { status: 'queued', message: 'Message will be sent when online' };
  }

  return fetch(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body
  });
}
```

### 19.8 WebSocket Reconnection

```javascript
class WebSocketManager {
  constructor(url, options = {}) {
    this.url = url;
    this.token = options.token;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.reconnectDelay = options.reconnectDelay || 1000;
    this.maxReconnectDelay = options.maxReconnectDelay || 30000;
    this.heartbeatInterval = options.heartbeatInterval || 30000;

    this.handlers = new Map();
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.authenticate();
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected', event.code, event.reason);
      this.stopHeartbeat();

      if (!event.wasClean) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  authenticate() {
    this.send('authenticate', { token: `Bearer ${this.token}` });
  }

  send(event, data) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }));
    }
  }

  handleMessage(message) {
    const handlers = this.handlers.get(message.event) || [];
    handlers.forEach((handler) => handler(message.data));
  }

  on(event, handler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event).push(handler);
  }

  off(event, handler) {
    const handlers = this.handlers.get(event) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay,
    );

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  startHeartbeat() {
    this.heartbeat = setInterval(() => {
      this.send('ping', {});
    }, this.heartbeatInterval);
  }

  stopHeartbeat() {
    if (this.heartbeat) {
      clearInterval(this.heartbeat);
    }
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
    }
  }
}

// Usage
const wsManager = new WebSocketManager('wss://api.yourdomain.com/ws/notifications', {
  token: accessToken,
  maxReconnectAttempts: 10,
  reconnectDelay: 1000,
  heartbeatInterval: 30000,
});

wsManager.on('notification.new', (data) => {
  console.log('New notification:', data);
  showNotification(data.notification);
});

wsManager.on('authenticated', (data) => {
  console.log('WebSocket authenticated:', data.userId);
});
```

### 19.9 Request Logging & Debugging

```javascript
class RequestLogger {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.logLevel = options.logLevel || 'info';
    this.onLog = options.onLog || console.log;
  }

  logRequest(method, url, options) {
    if (!this.enabled) return;

    const requestId = options.headers?.['X-Request-ID'];

    this.onLog({
      type: 'request',
      timestamp: new Date().toISOString(),
      requestId,
      method,
      url,
      headers: this.sanitizeHeaders(options.headers),
      body: this.sanitizeBody(options.body),
    });
  }

  logResponse(requestId, response, duration) {
    if (!this.enabled) return;

    this.onLog({
      type: 'response',
      timestamp: new Date().toISOString(),
      requestId,
      status: response.status,
      statusText: response.statusText,
      duration: `${duration}ms`,
      headers: Object.fromEntries(response.headers.entries()),
    });
  }

  logError(requestId, error) {
    if (!this.enabled) return;

    this.onLog({
      type: 'error',
      timestamp: new Date().toISOString(),
      requestId,
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: this.logLevel === 'debug' ? error.stack : undefined,
      },
    });
  }

  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    if (sanitized.Authorization) {
      sanitized.Authorization = sanitized.Authorization.replace(/Bearer .+/, 'Bearer [REDACTED]');
    }
    return sanitized;
  }

  sanitizeBody(body) {
    if (!body) return undefined;

    try {
      const parsed = typeof body === 'string' ? JSON.parse(body) : body;
      const sanitized = { ...parsed };

      // Redact sensitive fields
      const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
      sensitiveFields.forEach((field) => {
        if (sanitized[field]) {
          sanitized[field] = '[REDACTED]';
        }
      });

      return sanitized;
    } catch {
      return '[Unable to parse]';
    }
  }
}

// Usage
const logger = new RequestLogger({
  enabled: process.env.NODE_ENV !== 'production',
  logLevel: 'debug',
});
```

---
