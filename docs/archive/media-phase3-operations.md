## 📖 Table of Contents

- [Chunked upload](#chunked-upload)
- [CDN invalidation](#cdn-invalidation)
- [Public share](#public-share)

---

## Chunked upload

- Threshold (frontend): **20 MB** — files larger use S3 multipart via `POST /api/v1/media/upload/chunked/init`.
- Requires storage provider with multipart support (**S3**). Local-only storage will reject multipart init.

---

## CDN invalidation

After `media-worker` sets a file to `READY`, it enqueues:

```json
{ "type": "INVALIDATE_PATH", "paths": ["/api/v1/media/{id}", "/media/{id}"] }
```

to queue **`cdn.queue`**. Ensure `cdn-worker` and Cloudflare credentials are configured in the target environment.

---

## Public share

- API: `GET /api/v1/share/:token?password=optional` (no auth).
- Web UI: `/share/[token]` on the client app.
