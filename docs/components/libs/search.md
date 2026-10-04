# `@nestlancer/search` library

Prisma filter/sort builder for list endpoints.

## Used by

blog, portfolio, requests

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/search` |
| **Source** | `libs/search/src/` |
| **Source files (non-spec `.ts`)** | 5 |
| **Exported symbols (via `index.ts`)** | 5 |
| **Workspace dependencies** | none — leaf library |
| **External npm dependencies** | 4 |

## Package layout

Real directory tree of `libs/search/src/` (generated from the filesystem, depth-limited to 2):

```
src/
├── interfaces/
│   └── search.interface.ts
├── index.ts
├── search-indexer.service.ts
├── search.module.ts
└── search.service.ts
```

## Public API (exported from `@nestlancer/search`)

Extracted by resolving every `export * from '...'` / `export { ... } from '...'` statement in
`libs/search/src/index.ts` and reading the symbol each target file actually declares — this list
is generated from source, not hand-maintained.

### Modules (1)

| Export | Kind | Source |
| --- | --- | --- |
| `SearchModule` | class | `search/src/search.module.ts` |

### Services (2)

| Export | Kind | Source |
| --- | --- | --- |
| `SearchService` | class | `search/src/search.service.ts` |
| `SearchIndexerService` | class | `search/src/search-indexer.service.ts` |

### Interfaces (2)

| Export | Kind | Source |
| --- | --- | --- |
| `SearchOptions` | interface | `search/src/interfaces/search.interface.ts` |
| `SearchResult` | interface | `search/src/interfaces/search.interface.ts` |

## Dependencies

### Workspace (`@nestlancer/*`)

_No internal @nestlancer deps — this is a leaf library other packages can depend on safely._

### External (npm)

- `@nestjs/common` `^10.0.0`
- `meilisearch` `^0.35.0`
- `@nestjs/core` `^10.0.0`
- `rxjs` `^7.8.1`

## How to use in a service

1. Add to the consuming package's `package.json`: `"@nestlancer/search": "workspace:*"`
2. Import the symbol(s) you need from `@nestlancer/search` (see the Public API tables above for exact names)
3. Register `SearchModule` in the consuming app's root module (or a feature module)

```typescript
import { SearchModule } from '@nestlancer/search';

@Module({
  imports: [SearchModule],
})
export class AppModule {}
```

_Example above uses `SearchModule`, a real export of this package (modules defined in `search/src/search.module.ts`) — the surrounding NestJS wiring is illustrative, not copy-pasted from a specific call site._

## Related documentation

- [Monorepo structure decision](../../decisions/001-monorepo-structure.md)
- [Coding standards](../../development/coding-standards.md)
- [Component index](../README.md)
