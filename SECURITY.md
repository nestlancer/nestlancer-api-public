<div align="center">

# Security Policy

</div>

## Reporting a vulnerability

This repository does not currently have a dedicated security contact email configured. (One
placeholder, `security@yourdomain.com` in `docs/api/sdk-reference.md`, exists only as unfilled
template text — do not use it.)

**To report a security vulnerability, use GitHub's private vulnerability reporting** on this
repository: open the **Security** tab → **Report a vulnerability**. This creates a private
advisory visible only to the repository maintainers, not a public issue.

Please do not open a public GitHub issue for a suspected vulnerability.

What to include, if you can:

- A description of the vulnerability and its potential impact.
- Steps to reproduce (a minimal request/payload is ideal).
- Which service, worker, or shared library is affected, if known.

## Scope

This repository (`nestlancer-api-public`) is a sanitized public mirror of the Nestlancer backend —
see [`SANITIZATION_MANIFEST.md`](SANITIZATION_MANIFEST.md) for exactly what was removed/redacted
from the original before publishing, and [`OVERALL_REPORT_REMOVED.md`](OVERALL_REPORT_REMOVED.md)
for additional detail. If you find something in this mirror that looks like a secret, credential,
or internal detail that should have been sanitized, please report it the same way (GitHub private
vulnerability reporting) rather than filing a public issue, since drawing public attention to it
before it's rotated/removed would make things worse.

## Supported versions

This is an application (a backend monorepo deployed to dev/staging/production), not a versioned
library — there is no supported-version matrix. Security fixes land on `main` and roll out through
the normal CI/CD pipeline (see [`docs/operations/`](docs/operations/README.md)).

## How secrets are actually managed

Real secrets for every environment are stored in Infisical, not in this repository — see
[`docs/operations/secrets-infisical.md`](docs/operations/secrets-infisical.md). The `.env.*.example`
files at the repo root are templates with placeholder values only. If you find a real credential,
token, or key committed anywhere in this repo's history, treat it as compromised, report it via
GitHub private vulnerability reporting, and expect it to need rotation regardless of whether the
commit is later removed (Git history can be retained by clones/forks/mirrors made before a fix).

## Relevant security-related components

For context when reporting or reviewing: [`libs/auth-lib`](docs/components/libs/auth-lib.md)
(JWT/session auth), [`libs/crypto`](docs/components/libs/crypto.md),
[`libs/turnstile`](docs/components/libs/turnstile.md) (bot/abuse protection), and `helmet`
HTTP-header hardening in [`gateway`](docs/components/gateway.md).
