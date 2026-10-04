<div align="center">

# Architecture

### How the system is put together.

</div>

| Doc | Covers |
| :-- | :-- |
| [Overview](overview.md) | System architecture, service/worker/gateway topology, default ports |
| [Data flow](data-flow.md) | How requests and data move through the gateway, services, and workers |
| [Database schema](database-schema.md) | Prisma schema structure, model ownership per service |
| [Event catalog](event-catalog.md) | Domain events published/consumed across services and workers |
| [Queue topology](queue-topology.md) | RabbitMQ exchanges, queues, bindings, and DLQ routing |
| [WebSocket protocol](websocket-protocol.md) | `ws-gateway` connection and message protocol |
| [System diagram](system-diagram.mmd) | Mermaid source for the system diagram |

See also: [`docs/reference/repository-structure.md`](../reference/repository-structure.md) for the
file/directory layout, and [`docs/decisions/`](../decisions/README.md) for *why* the architecture
looks this way.
