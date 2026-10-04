# `@nestlancer/common` library

Foundation: API envelope types, enums, decorators (@Public, @Roles), filters, interceptors, money/pagination utils.

## Used by

Every service and gateway

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/common` |
| **Source** | `libs/common/src/` |
| **Source files (non-spec `.ts`)** | 106 |
| **Exported symbols (via `index.ts`)** | 275 |
| **Workspace dependencies** | 1 |
| **External npm dependencies** | 7 |

## Package layout

Real directory tree of `libs/common/src/` (generated from the filesystem, depth-limited to 2):

```
src/
├── constants/
│   ├── app.constants.ts
│   ├── currency.constants.ts
│   ├── error-codes.constants.ts
│   ├── file-limits.constants.ts
│   ├── messaging-realtime.constants.ts
│   ├── mime-types.constants.ts
│   ├── pagination.constants.ts
│   ├── progress-visibility.constants.spec.ts
│   ├── progress-visibility.constants.ts
│   ├── project-access.constants.ts
│   ├── project-messaging.constants.ts
│   ├── regex.constants.ts
│   ├── standard-quote-terms.constants.ts
│   └── swagger.constants.ts
├── contracts/
│   └── contract-template-data.util.ts
├── decorators/
│   ├── api-paginated.decorator.ts
│   ├── api-standard-response.decorator.ts
│   ├── api-standard-responses.decorator.ts
│   ├── client-ip.decorator.ts
│   ├── current-user.decorator.ts
│   ├── idempotency-key.decorator.ts
│   ├── public.decorator.ts
│   ├── roles.decorator.ts
│   └── trim.decorator.ts
├── dto/
│   ├── api-success-envelope.dto.ts
│   ├── bulk-operation.dto.ts
│   ├── date-range-query.dto.ts
│   ├── id-param.dto.ts
│   ├── pagination-query.dto.ts
│   └── response-metadata.dto.ts
├── enums/
│   ├── comment-status.enum.ts
│   ├── contact-status.enum.ts
│   ├── contact-subject.enum.ts
│   ├── deliverable-status.enum.ts
│   ├── index.ts
│   ├── media-status.enum.ts
│   ├── message-type.enum.ts
│   ├── milestone-status.enum.ts
│   ├── notification-priority.enum.ts
│   ├── outbox-event-status.enum.ts
│   ├── payment-status.enum.ts
│   ├── portfolio-status.enum.ts
│   ├── post-status.enum.ts
│   ├── project-status.enum.ts
│   ├── quote-status.enum.ts
│   ├── request-status.enum.ts
│   ├── sort-order.enum.ts
│   ├── user-role.enum.ts
│   ├── user-status.enum.ts
│   └── webhook-log-status.enum.ts
├── exceptions/
│   ├── base.exception.ts
│   ├── business-logic.exception.ts
│   ├── external-service.exception.ts
│   ├── forbidden.exception.ts
│   ├── idempotency.exception.ts
│   ├── rate-limit.exception.ts
│   ├── resource-conflict.exception.ts
│   ├── resource-not-found.exception.ts
│   └── validation.exception.ts
├── filters/
│   ├── all-exceptions.filter.ts
│   └── http-exception.filter.ts
├── interceptors/
│   ├── logging.interceptor.ts
│   ├── timeout.interceptor.ts
│   └── transform-response.interceptor.ts
├── interfaces/
│   ├── base-entity.interface.ts
│   ├── notification.interface.ts
│   ├── pagination.interface.ts
│   └── request-context.interface.ts
├── observability/
│   ├── correlation-id.ts
│   ├── log-context.ts
│   └── write-log.ts
├── payment/
│   ├── client-payment-notes.ts
│   ├── client-tier.util.ts
│   ├── default-payment-breakdown.ts
│   ├── deposit-milestone.util.ts
│   ├── milestone-sequence.util.ts
│   ├── payment-completion.service.ts
│   ├── payment-gate.constants.ts
│   ├── payment-schedule.types.ts
│   ├── payment-schedule.util.ts
│   ├── payment-terms.util.ts
│   └── quote-line-items.util.ts
├── pipes/
│   ├── parse-pagination.pipe.ts
│   ├── parse-uuid.pipe.ts
│   ├── sanitize.pipe.ts
│   └── validation.pipe.ts
├── state-machines/
│   └── status-transitions.ts
├── types/
│   ├── api-response.type.ts
│   ├── error-response.type.ts
│   └── paginated-response.type.ts
├── utils/
│   ├── audit-log.util.ts
│   ├── clamp-pagination.util.ts
│   ├── client-ip.util.ts
│   ├── date.util.ts
│   ├── hash.util.ts
│   ├── indian-tax-id.util.ts
│   ├── money.util.ts
│   ├── pagination.util.ts
│   ├── rate-limit-env.util.ts
│   ├── redact-url.util.ts
│   ├── retry.util.ts
│   ├── sanitize.util.ts
│   ├── slug.util.ts
│   ├── user-agent.util.ts
│   ├── uuid.util.ts
│   └── webhook-url.util.ts
└── index.ts
```

## Public API (exported from `@nestlancer/common`)

Extracted by resolving every `export * from '...'` / `export { ... } from '...'` statement in
`libs/common/src/index.ts` and reading the symbol each target file actually declares — this list
is generated from source, not hand-maintained.

### Decorators (15)

| Export | Kind | Source |
| --- | --- | --- |
| `IS_PUBLIC_KEY` | const | `common/src/decorators/public.decorator.ts` |
| `Public` | const | `common/src/decorators/public.decorator.ts` |
| `ROLES_KEY` | const | `common/src/decorators/roles.decorator.ts` |
| `Roles` | const | `common/src/decorators/roles.decorator.ts` |
| `CurrentUser` | const | `common/src/decorators/current-user.decorator.ts` |
| `ClientIp` | const | `common/src/decorators/client-ip.decorator.ts` |
| `IdempotencyKey` | const | `common/src/decorators/idempotency-key.decorator.ts` |
| `ApiPaginated` | const | `common/src/decorators/api-paginated.decorator.ts` |
| `ApiStandardResponseOptions` | interface | `common/src/decorators/api-standard-response.decorator.ts` |
| `ApiStandardResponse` | function | `common/src/decorators/api-standard-response.decorator.ts` |
| `SuccessResponse` | function | `common/src/decorators/api-standard-response.decorator.ts` |
| `IDEMPOTENT_KEY` | const | `common/src/decorators/api-standard-response.decorator.ts` |
| `Idempotent` | function | `common/src/decorators/api-standard-response.decorator.ts` |
| `ApiStandardResponses` | function | `common/src/decorators/api-standard-responses.decorator.ts` |
| `Trim` | const | `common/src/decorators/trim.decorator.ts` |

### Interceptors (5)

| Export | Kind | Source |
| --- | --- | --- |
| `LoggingInterceptor` | class | `common/src/interceptors/logging.interceptor.ts` |
| `resolveResponsePath` | function | `common/src/interceptors/transform-response.interceptor.ts` |
| `normalizeSuccessEnvelope` | function | `common/src/interceptors/transform-response.interceptor.ts` |
| `TransformResponseInterceptor` | class | `common/src/interceptors/transform-response.interceptor.ts` |
| `TimeoutInterceptor` | class | `common/src/interceptors/timeout.interceptor.ts` |

### Filters (2)

| Export | Kind | Source |
| --- | --- | --- |
| `AllExceptionsFilter` | class | `common/src/filters/all-exceptions.filter.ts` |
| `HttpExceptionFilter` | class | `common/src/filters/http-exception.filter.ts` |

### Pipes (4)

| Export | Kind | Source |
| --- | --- | --- |
| `AppValidationPipe` | class | `common/src/pipes/validation.pipe.ts` |
| `ParseUuidPipe` | class | `common/src/pipes/parse-uuid.pipe.ts` |
| `ParsePaginationPipe` | class | `common/src/pipes/parse-pagination.pipe.ts` |
| `SanitizePipe` | class | `common/src/pipes/sanitize.pipe.ts` |

### Interfaces (9)

| Export | Kind | Source |
| --- | --- | --- |
| `BaseEntity` | interface | `common/src/interfaces/base-entity.interface.ts` |
| `SoftDeletableEntity` | interface | `common/src/interfaces/base-entity.interface.ts` |
| `PaginationOptions` | interface | `common/src/interfaces/pagination.interface.ts` |
| `PaginatedResult` | interface | `common/src/interfaces/pagination.interface.ts` |
| `RequestContext` | interface | `common/src/interfaces/request-context.interface.ts` |
| `AuthenticatedUser` | interface | `common/src/interfaces/request-context.interface.ts` |
| `NotificationChannel` | enum | `common/src/interfaces/notification.interface.ts` |
| `NotificationJobType` | enum | `common/src/interfaces/notification.interface.ts` |
| `NotificationJob` | interface | `common/src/interfaces/notification.interface.ts` |

### DTOs (6)

| Export | Kind | Source |
| --- | --- | --- |
| `PaginationQueryDto` | class | `common/src/dto/pagination-query.dto.ts` |
| `DateRangeQueryDto` | class | `common/src/dto/date-range-query.dto.ts` |
| `IdParamDto` | class | `common/src/dto/id-param.dto.ts` |
| `BulkOperationDto` | class | `common/src/dto/bulk-operation.dto.ts` |
| `ResponseMetadataDto` | class | `common/src/dto/response-metadata.dto.ts` |
| `ApiSuccessEnvelopeDto` | class | `common/src/dto/api-success-envelope.dto.ts` |

### Types (7)

| Export | Kind | Source |
| --- | --- | --- |
| `ApiResponse` | interface | `common/src/types/api-response.type.ts` |
| `ResponseMetadata` | interface | `common/src/types/api-response.type.ts` |
| `PaginatedResponse` | interface | `common/src/types/paginated-response.type.ts` |
| `PaginationMeta` | interface | `common/src/types/paginated-response.type.ts` |
| `ErrorResponse` | interface | `common/src/types/error-response.type.ts` |
| `ErrorDetail` | interface | `common/src/types/error-response.type.ts` |
| `ValidationErrorDetail` | interface | `common/src/types/error-response.type.ts` |

### Enums (19)

| Export | Kind | Source |
| --- | --- | --- |
| `UserRole` | enum | `common/src/enums/user-role.enum.ts` |
| `UserStatus` | enum | `common/src/enums/user-status.enum.ts` |
| `RequestStatus` | enum | `common/src/enums/request-status.enum.ts` |
| `QuoteStatus` | enum | `common/src/enums/quote-status.enum.ts` |
| `ProjectStatus` | enum | `common/src/enums/project-status.enum.ts` |
| `MilestoneStatus` | enum | `common/src/enums/milestone-status.enum.ts` |
| `DeliverableStatus` | enum | `common/src/enums/deliverable-status.enum.ts` |
| `PaymentStatus` | enum | `common/src/enums/payment-status.enum.ts` |
| `MessageType` | enum | `common/src/enums/message-type.enum.ts` |
| `NotificationPriority` | enum | `common/src/enums/notification-priority.enum.ts` |
| `MediaStatus` | enum | `common/src/enums/media-status.enum.ts` |
| `PortfolioStatus` | enum | `common/src/enums/portfolio-status.enum.ts` |
| `PostStatus` | enum | `common/src/enums/post-status.enum.ts` |
| `CommentStatus` | enum | `common/src/enums/comment-status.enum.ts` |
| `ContactStatus` | enum | `common/src/enums/contact-status.enum.ts` |
| `WebhookLogStatus` | enum | `common/src/enums/webhook-log-status.enum.ts` |
| `OutboxEventStatus` | enum | `common/src/enums/outbox-event-status.enum.ts` |
| `SortOrder` | enum | `common/src/enums/sort-order.enum.ts` |
| `ContactSubject` | enum | `common/src/enums/contact-subject.enum.ts` |

### Constants (75)

| Export | Kind | Source |
| --- | --- | --- |
| `APP_NAME` | const | `common/src/constants/app.constants.ts` |
| `APP_VERSION` | const | `common/src/constants/app.constants.ts` |
| `API_PREFIX` | const | `common/src/constants/app.constants.ts` |
| `API_VERSION` | const | `common/src/constants/app.constants.ts` |
| `API_BASE_PATH` | const | `common/src/constants/app.constants.ts` |
| `DEFAULT_GATEWAY_PORT` | const | `common/src/constants/app.constants.ts` |
| `DEFAULT_WS_PORT` | const | `common/src/constants/app.constants.ts` |
| `DEFAULT_REQUEST_TIMEOUT_MS` | const | `common/src/constants/app.constants.ts` |
| `UPLOAD_REQUEST_TIMEOUT_MS` | const | `common/src/constants/app.constants.ts` |
| `WEBHOOK_REQUEST_TIMEOUT_MS` | const | `common/src/constants/app.constants.ts` |
| `MAX_PAYLOAD_SIZE` | const | `common/src/constants/app.constants.ts` |
| `MAX_UPLOAD_SIZE` | const | `common/src/constants/app.constants.ts` |
| `HEALTH_CHECK_TIMEOUT_MS` | const | `common/src/constants/app.constants.ts` |
| `HEALTH_CACHE_TTL_SECONDS` | const | `common/src/constants/app.constants.ts` |
| `DEFAULT_TIMEZONE` | const | `common/src/constants/app.constants.ts` |
| `DEFAULT_LOCALE` | const | `common/src/constants/app.constants.ts` |
| `CACHE_TTL_SHORT` | const | `common/src/constants/app.constants.ts` |
| `CACHE_TTL_MEDIUM` | const | `common/src/constants/app.constants.ts` |
| `CACHE_TTL_LONG` | const | `common/src/constants/app.constants.ts` |
| `CACHE_TTL_VERY_LONG` | const | `common/src/constants/app.constants.ts` |
| … | | _55 more — see `common/src/index.ts`_ |

### Contracts (3)

| Export | Kind | Source |
| --- | --- | --- |
| `ContractTemplateQuote` | type | `common/src/contracts/contract-template-data.util.ts` |
| `buildContractTemplateData` | function | `common/src/contracts/contract-template-data.util.ts` |
| `resolveContractStatus` | function | `common/src/contracts/contract-template-data.util.ts` |

### Observability (12)

| Export | Kind | Source |
| --- | --- | --- |
| `CORRELATION_ID_PATTERN` | const | `common/src/observability/correlation-id.ts` |
| `isUsableCorrelationId` | function | `common/src/observability/correlation-id.ts` |
| `normalizeCorrelationId` | function | `common/src/observability/correlation-id.ts` |
| `LogContext` | interface | `common/src/observability/log-context.ts` |
| `getLogContext` | function | `common/src/observability/log-context.ts` |
| `runWithLogContext` | function | `common/src/observability/log-context.ts` |
| `setLogContext` | function | `common/src/observability/log-context.ts` |
| `LogLevel` | type | `common/src/observability/write-log.ts` |
| `LogFields` | interface | `common/src/observability/write-log.ts` |
| `readActiveTraceIds` | function | `common/src/observability/write-log.ts` |
| `serviceName` | function | `common/src/observability/write-log.ts` |
| `writeLog` | function | `common/src/observability/write-log.ts` |

### Payment (59)

| Export | Kind | Source |
| --- | --- | --- |
| `PaymentBreakdownItem` | type | `common/src/payment/default-payment-breakdown.ts` |
| `DefaultSplitConfig` | type | `common/src/payment/default-payment-breakdown.ts` |
| `DEFAULT_PAYMENT_SPLIT` | const | `common/src/payment/default-payment-breakdown.ts` |
| `buildDefaultPaymentBreakdown` | function | `common/src/payment/default-payment-breakdown.ts` |
| `PAYMENT_GATE_ERROR` | const | `common/src/payment/payment-gate.constants.ts` |
| `DepositMilestoneCandidate` | type | `common/src/payment/deposit-milestone.util.ts` |
| `MilestoneScheduleProbe` | type | `common/src/payment/deposit-milestone.util.ts` |
| `LinkedInstallmentResolution` | type | `common/src/payment/deposit-milestone.util.ts` |
| `extractScheduleLabelSet` | function | `common/src/payment/deposit-milestone.util.ts` |
| `sortMilestonesForDeposit` | function | `common/src/payment/deposit-milestone.util.ts` |
| `pickDepositMilestoneId` | function | `common/src/payment/deposit-milestone.util.ts` |
| `isDepositMilestoneName` | function | `common/src/payment/deposit-milestone.util.ts` |
| `isPaymentScheduleMilestoneName` | function | `common/src/payment/deposit-milestone.util.ts` |
| `isPaymentScheduleMilestone` | function | `common/src/payment/deposit-milestone.util.ts` |
| `projectHasWorkMilestones` | function | `common/src/payment/deposit-milestone.util.ts` |
| `isPayOnlyMilestone` | function | `common/src/payment/deposit-milestone.util.ts` |
| `resolveLinkedInstallmentResolution` | function | `common/src/payment/deposit-milestone.util.ts` |
| `resolveInstallmentMilestoneForWorkApproval` | function | `common/src/payment/deposit-milestone.util.ts` |
| `resolveLinkedInstallmentForWorkDisplay` | function | `common/src/payment/deposit-milestone.util.ts` |
| `MilestoneSequenceRow` | type | `common/src/payment/milestone-sequence.util.ts` |
| … | | _39 more — see `common/src/index.ts`_ |

### State machines (4)

| Export | Kind | Source |
| --- | --- | --- |
| `isValidTransition` | function | `common/src/state-machines/status-transitions.ts` |
| `assertValidTransition` | function | `common/src/state-machines/status-transitions.ts` |
| `PROJECT_WORK_BLOCKED_STATUSES` | const | `common/src/state-machines/status-transitions.ts` |
| `assertProjectWorkAllowed` | function | `common/src/state-machines/status-transitions.ts` |

### Exceptions (9)

| Export | Kind | Source |
| --- | --- | --- |
| `BaseAppException` | class | `common/src/exceptions/base.exception.ts` |
| `BusinessLogicException` | class | `common/src/exceptions/business-logic.exception.ts` |
| `ResourceNotFoundException` | class | `common/src/exceptions/resource-not-found.exception.ts` |
| `ResourceConflictException` | class | `common/src/exceptions/resource-conflict.exception.ts` |
| `ForbiddenException` | class | `common/src/exceptions/forbidden.exception.ts` |
| `ValidationException` | class | `common/src/exceptions/validation.exception.ts` |
| `RateLimitException` | class | `common/src/exceptions/rate-limit.exception.ts` |
| `ExternalServiceException` | class | `common/src/exceptions/external-service.exception.ts` |
| `IdempotencyConflictException` | class | `common/src/exceptions/idempotency.exception.ts` |

### Utilities (46)

| Export | Kind | Source |
| --- | --- | --- |
| `generateSlug` | function | `common/src/utils/slug.util.ts` |
| `generateUniqueSlug` | function | `common/src/utils/slug.util.ts` |
| `toISO` | function | `common/src/utils/date.util.ts` |
| `now` | function | `common/src/utils/date.util.ts` |
| `addMinutes` | function | `common/src/utils/date.util.ts` |
| `addHours` | function | `common/src/utils/date.util.ts` |
| `addDays` | function | `common/src/utils/date.util.ts` |
| `isExpired` | function | `common/src/utils/date.util.ts` |
| `diffInSeconds` | function | `common/src/utils/date.util.ts` |
| `toPaise` | function | `common/src/utils/money.util.ts` |
| `toRupees` | function | `common/src/utils/money.util.ts` |
| `formatINR` | function | `common/src/utils/money.util.ts` |
| `isValidAmount` | function | `common/src/utils/money.util.ts` |
| `splitInclusiveTaxPaise` | function | `common/src/utils/money.util.ts` |
| `resolveManualPaymentAmountPaise` | function | `common/src/utils/money.util.ts` |
| `paginate` | function | `common/src/utils/pagination.util.ts` |
| `toPaginationMeta` | function | `common/src/utils/pagination.util.ts` |
| `calculateSkip` | function | `common/src/utils/pagination.util.ts` |
| `buildPrismaSkipTake` | function | `common/src/utils/pagination.util.ts` |
| `createPaginationMeta` | function | `common/src/utils/pagination.util.ts` |
| … | | _26 more — see `common/src/index.ts`_ |

## Dependencies

### Workspace (`@nestlancer/*`)

- `@nestlancer/database`

### External (npm)

- `@nestjs/common` `^10.0.0`
- `@nestjs/core` `^10.0.0`
- `@nestjs/swagger` `^7.0.0`
- `class-validator` `^0.14.0`
- `class-transformer` `^0.5.1`
- `rxjs` `^7.8.0`
- `uuid` `^13.0.0`

## How to use in a service

1. Add to the consuming package's `package.json`: `"@nestlancer/common": "workspace:*"`
2. Import the symbol(s) you need from `@nestlancer/common` (see the Public API tables above for exact names)
3. Inject/apply `IS_PUBLIC_KEY` where appropriate (decorators)

```typescript
import { IS_PUBLIC_KEY } from '@nestlancer/common';

@IS_PUBLIC_KEY()
handler() {
  /* ... */
}
```

_Example above uses `IS_PUBLIC_KEY`, a real export of this package (decorators defined in `common/src/decorators/public.decorator.ts`) — the surrounding NestJS wiring is illustrative, not copy-pasted from a specific call site._

## Related documentation

- [Monorepo structure decision](../../decisions/001-monorepo-structure.md)
- [Coding standards](../../development/coding-standards.md)
- [Component index](../README.md)
