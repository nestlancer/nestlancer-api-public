# Seeding documentation

Reference docs for the client and admin pipeline. The runner is [`seed/seed.sh`](../../seed/seed.sh).

| Document                                                                             | Purpose                                                          |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| [`ADMIN-CLIENT-COMPLETE-FLOW.md`](ADMIN-CLIENT-COMPLETE-FLOW.md)                     | Architecture, state machines, handoffs, audit                    |
| [`ADMIN-CLIENT-COMPLETE-FLOW-endpoints.md`](ADMIN-CLIENT-COMPLETE-FLOW-endpoints.md) | API reference used by `seed/demo/` step 2                        |

**Run seeds:** full steps are in [`seed/README.md`](../../seed/README.md). Short version, from the backend repo root, with the matching containers already up:

```bash
# Confirm .env.infisical is the database you mean (prints host and db name, not passwords).
# Then seed one phase. --skip-export uses the file already on disk.

# Dev catalog
bash seed/seed.sh --env=dev --phase=core --skip-export
bash seed/seed.sh --env=dev --phase=blogs --skip-export
bash seed/seed.sh --env=dev --phase=portfolio --skip-export

# Prod catalog. Does not wipe data and does not create demo users.
bash seed/seed.sh --env=prod --phase=core,content --skip-export
```

On the prod host, `seed.sh` calls `nl-prod-*` containers directly. Do not point `API_BASE_URL` at the public gateway for a normal seed.
