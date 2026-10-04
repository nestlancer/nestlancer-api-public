<div align="center">

# Development

### Everything you need to work on this repo day to day.

</div>

| Doc | What it covers |
| :-- | :-- |
| [Setup](setup.md) | Day-1 onboarding: prerequisites, cloning, env files, first run |
| [Quickstart](quickstart.md) | The condensed version of setup — prerequisites, install, first run, nothing else |
| [Local workflow](local-workflow.md) | Day-to-day dev loop: watch mode, Docker dev stack, env files, shared infra over Tailscale |
| [Testing](testing.md) | Testing strategy and pyramid: unit, integration, e2e, system |
| [Test commands](test-commands.md) | Command-by-command reference for running tests |
| [Coding standards](coding-standards.md) | Style, lint rules, commit conventions |
| [Adding a service](adding-a-service.md) | Step-by-step: scaffolding a new microservice |
| [Adding a worker](adding-a-worker.md) | Step-by-step: scaffolding a new queue worker |
| [Modification playbook](modification-playbook.md) | How to safely add endpoints, migrations, and cross-cutting changes to existing code |
| [Troubleshooting](troubleshooting.md) | Common local dev problems and fixes |

See also: [`docs/reference/commands.md`](../reference/commands.md) for the full `pnpm`/`make`
command surface, and [`docs/reference/environment-variables.md`](../reference/environment-variables.md)
for every environment variable.

> **Note on `setup.md` vs `quickstart.md`:** these were two separate, overlapping guides
> (`onboarding.md` and `getting-started.md`) before the 2026-10 documentation reset. They were kept
> as two files rather than hand-merged into one, to avoid introducing errors while combining two
> independently-written documents; `setup.md` is the fuller walkthrough, `quickstart.md` is the
> condensed reference. If you update one, check whether the other needs the same update.
