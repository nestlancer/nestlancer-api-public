<div align="center">

# Testing Strategy

</div>

---

## 📖 Table of Contents

- [Testing Pyramid](#testing-pyramid)
- [Unit Tests](#unit-tests)
- [Integration Tests](#integration-tests)
- [E2E Tests](#e2e-tests)
- [Fixtures and Factories](#fixtures-and-factories)

---

## Testing Pyramid

```
        ╱  E2E Tests  ╲          ← Few, slow, high confidence
       ╱───────────────╲
      ╱ Integration Tests╲      ← Moderate, real DB/queue
     ╱────────────────────╲
    ╱    Unit Tests         ╲    ← Many, fast, isolated
   ╱─────────────────────────╲
```

---

## Unit Tests

### Purpose

Test individual functions, services, and controllers in isolation.

### Running

```bash
pnpm test              # All unit tests
pnpm test -- --watch   # Watch mode
pnpm turbo test        # Via Turborepo (parallel)
```

### Conventions

- File: `*.spec.ts` next to source file
- Use Jest mocks for dependencies
- Import factories from `@nestlancer/testing`
- Coverage target: 80% lines/branches/functions

### Example

```typescript
describe('AuthService', () => {
  let service: AuthService;
  let userRepo: jest.Mocked<UserRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [AuthService, { provide: UserRepository, useValue: createMockRepository() }],
    }).compile();
    service = module.get(AuthService);
    userRepo = module.get(UserRepository);
  });

  it('should register a new user', async () => {
    userRepo.findByEmail.mockResolvedValue(null);
    userRepo.create.mockResolvedValue(mockUser);
    const result = await service.register(registerDto);
    expect(result).toBeDefined();
    expect(userRepo.create).toHaveBeenCalledOnce();
  });
});
```

---

## Integration Tests

### Running

```bash
pnpm test:integration   # Requires Docker services
```

### Scope

- Real database (PostgreSQL via docker-compose.test.yml)
- Real Redis
- Prisma queries and repository methods
- Queue publishing verification
- Cache operations

---

## E2E Tests

### Running

```bash
pnpm test:e2e           # Full stack required
```

### Scope

Complete request lifecycle:

1. Registration → Login → Token management
2. Request submission → Quote → Project creation
3. Progress tracking → Milestone → Payment

---

## Fixtures and Factories

Use `@nestlancer/testing` library:

```typescript
import { createMockUser, createMockProject } from '@nestlancer/testing';

const user = createMockUser({ role: UserRole.ADMIN });
const project = createMockProject({ userId: user.id, status: ProjectStatus.ACTIVE });
```

---

<div align="center">

**Testing Strategy** — Nestlancer guide

</div>
