# Origin certificates removed from this share package

Production Cloudflare Origin CA materials (`origin.pem` / `origin.key`) were
intentionally stripped from this sanitized export.

Install locally with:

```bash
bash scripts/docker/install-prod-origin-certs.sh \
  --cert /path/to/origin.pem \
  --key /path/to/origin.key
```

See `README.md` in this directory for the full procedure.
