## 20. Changelog

### Version History

#### v1.1.0 (2024-02-18) - Current

**Fixed:**

- Added Turnstile requirement to `/auth/register` and `/auth/check-email`
- Added rate limit 429 response format specification
- Fixed user enumeration vulnerability in email check endpoint
- Added CSRF token requirement for state-changing operations
- Standardized pagination defaults across all services

**Added:**

- Idempotency key specification for critical operations
- Complete error response examples for all error codes
- WebSocket authentication documentation
- Input validation rules section
- Currency handling standards
- CORS policy documentation
- Field selection and expansion parameters
- Webhook signature verification examples
- Error recovery and best practices section
- SDK reference section

**Changed:**

- Updated rate limits for security-sensitive endpoints
- Improved filter operators documentation
- Enhanced versioning policy with deprecation timeline

---

#### v1.0.0 (2024-01-15) - Initial Release

**Added:**

- Initial API documentation
- 428 endpoints across 15 services
- Health Service (16 endpoints)
- Authentication Service (11 endpoints)
- Users Service (39 endpoints)
- Requests Service (21 endpoints)
- Quotes Service (18 endpoints)
- Projects Service (26 endpoints)
- Progress Service (22 endpoints)
- Payments Service (33 endpoints)
- Messaging Service (19 endpoints)
- Notifications Service (27 endpoints)
- Media Service (28 endpoints)
- Portfolio Service (26 endpoints)
- Blog Service (56 endpoints)
- Contact Service (31 endpoints)
- Admin Service (55 endpoints)
- WebSocket endpoints for real-time features
- Comprehensive error code reference

---

### Upcoming Changes

#### v1.2.0 (Planned - Q2 2024)

- GraphQL API endpoint (beta)
- Batch operations support
- Enhanced search with Elasticsearch
- Multi-language content support
- API key authentication for integrations

#### v2.0.0 (Planned - Q4 2024)

- Breaking changes TBD
- Major performance improvements
- New microservices architecture
- Enhanced real-time capabilities

---

### Deprecation Schedule

| Feature        | Deprecated | Sunset | Replacement |
| :------------- | :--------- | :----- | :---------- |
| None currently | -          | -      | -           |

---
