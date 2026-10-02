## 📖 Table of Contents

- [Status](#status)
- [Date](#date)
- [Context](#context)
- [Decision](#decision)
- [Rationale](#rationale)
- [Consequences](#consequences)

---

## Status

Accepted

---

## Date

2025-12-01

---

## Context

Frequently accessed data (portfolio items, blog posts, user profiles, system config) should be cached to reduce database load and improve response times.

---

## Decision

Use **Redis caching** with tag-based invalidation and entity-specific TTLs.

### Cache Layers

1. **HTTP Cache**: ETag/If-None-Match via `EtagInterceptor` (304 responses)
2. **Application Cache**: Redis with TTL per entity type via `@Cacheable()` decorator
3. **Database Query Cache**: Prisma query results (most impactful)

### TTLs by Entity

| Entity                   | TTL      | Reason                    |
| :----------------------- | :------- | :------------------------ |
| Health checks            | 30s      | Frequently polled         |
| User profiles            | 5 min    | Moderate change frequency |
| Portfolio items (public) | 1 hour   | Rarely updated            |
| Blog posts (public)      | 1 hour   | Rarely updated            |
| System config            | 24 hours | Almost never changes      |
| API responses (default)  | 5 min    | General purpose           |

### Tag-Based Invalidation

```typescript
// Reading: cache with tags
@Cacheable({ key: 'portfolio:list', ttl: 3600, tags: ['portfolio'] })
async findPublished() { ... }

// Writing: invalidate by tag
@CacheInvalidate({ tags: ['portfolio'] })
async updateItem(id: string, data: UpdatePortfolioItemDto) { ... }
```

Redis Sets store tag→key mappings:

- `tag:portfolio` → `['portfolio:list', 'portfolio:item:abc', ...]`
- Invalidating tag deletes all keys in the set

### Cache-Aside Pattern

```
GET request → Check Redis → Hit? Return cached
                           → Miss? Query DB → Store in Redis → Return
```

---

## Rationale

- **Tag-based invalidation**: Efficient bulk invalidation without knowing all keys
- **Entity-specific TTLs**: Balances freshness vs performance per domain
- **Cache-aside**: Simple, transparent, no cache stampede with proper TTLs
- **ETag layer**: Saves bandwidth for polling clients (notifications, messages)

---

## Consequences

- Redis `maxmemory-policy: allkeys-lru` evicts least recently used keys
- Cache consistency: eventual consistency acceptable for public content
- `@CacheInvalidate()` must be applied to all mutation methods
- SCAN used instead of KEYS to avoid blocking Redis
