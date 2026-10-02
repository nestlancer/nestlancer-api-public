<div align="center">

# Coding Standards

</div>

---

## 📖 Table of Contents

- [Naming Conventions](#naming-conventions)
- [File Organization](#file-organization)
- [Error Handling](#error-handling)
- [Response Format](#response-format)
- [DTO Validation](#dto-validation)
- [Currency](#currency)
- [Dates](#dates)
- [IDs](#ids)

---

## Naming Conventions

| Type       | Convention                                   | Example                                    |
| :--------- | :------------------------------------------- | :----------------------------------------- |
| Files      | `kebab-case.type.ts`                         | `create-request.dto.ts`, `auth.service.ts` |
| Classes    | `PascalCase`                                 | `AuthService`, `CreateRequestDto`          |
| Methods    | `camelCase`                                  | `findById`, `createPaymentIntent`          |
| Constants  | `UPPER_SNAKE_CASE`                           | `DEFAULT_PAGINATION_LIMIT`                 |
| Enums      | `PascalCase` name, `UPPER_SNAKE_CASE` values | `UserRole.ADMIN`                           |
| Interfaces | `PascalCase` (prefix `I` optional)           | `AuthenticatedUser`                        |

---

## File Organization

Every module follows this structure:

```
<service>/src/
├── <feature>.module.ts
├── <feature>.controller.ts
├── <feature>.service.ts
├── <feature>.repository.ts
├── dto/
│   ├── create-<feature>.dto.ts
│   └── update-<feature>.dto.ts
├── interfaces/
│   └── <feature>.interface.ts
└── tests/
    └── <feature>.service.spec.ts
```

---

## Error Handling

Always throw custom exceptions from `@nestlancer/common/exceptions`:

```typescript
// ✅ Good
throw new ResourceNotFoundException('User', userId);
throw new BusinessLogicException('Quote has expired', 'QUOTE_EXPIRED');

// ❌ Bad
throw new Error('Not found');
throw new HttpException('Bad request', 400);
```

---

## Response Format

All endpoints use the standard envelope via `TransformResponseInterceptor`:

```typescript
// Returned automatically - just return the data
return { user, tokens };
// Becomes: { status: 'success', data: { user, tokens }, metadata: {...} }
```

---

## DTO Validation

All inputs validated with `class-validator` decorators:

```typescript
export class CreateRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Trim()
  title: string;

  @IsEnum(RequestCategory)
  category: RequestCategory;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BudgetRangeDto)
  budgetRange?: BudgetRangeDto;
}
```

---

## Currency

- INR only, amounts in **paise** (integer)
- Use `money.util.ts` for conversions
- Display format: `₹1,500.00`

---

## Dates

- Store/transmit in **ISO 8601 UTC**
- Display timezone: `Asia/Kolkata`

---

## IDs

- UUID v4 via `generateUuid() from @nestlancer/common (UUID v7)`
- Validated with `@IsUUID()` decorator

---

<div align="center">

**Coding Standards** — Nestlancer guide

</div>
