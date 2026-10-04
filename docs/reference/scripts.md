<div align="center">

# Scripts

</div>

The canonical, maintained catalog of every script under `scripts/` — grouped by responsibility,
each tagged with a safety classification (safe to run anytime / requires confirmation / destructive
/ CI-only) — lives at **[`scripts/README.md`](../../scripts/README.md)**, next to the scripts
themselves, so it's easy to keep in sync as scripts change.

This file is a pointer rather than a duplicate on purpose: `docs/` describes what the repo *is*,
and keeping script documentation colocated with the scripts avoids the two drifting apart.

For the `pnpm`/`make` command surface that invokes these scripts, see
[`docs/reference/commands.md`](commands.md).
