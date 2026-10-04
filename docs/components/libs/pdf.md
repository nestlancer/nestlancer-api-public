# `@nestlancer/pdf` library

PDFKit templates for quotes, invoices, receipts.

## Used by

quotes, payments

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/pdf` |
| **Source** | `libs/pdf/src/` |
| **Source files (non-spec `.ts`)** | 21 |
| **Exported symbols (via `index.ts`)** | 60 |
| **Workspace dependencies** | none — leaf library |
| **External npm dependencies** | 6 |

## Package layout

Real directory tree of `libs/pdf/src/` (generated from the filesystem, depth-limited to 2):

```
src/
├── constants/
│   └── template-version.ts
├── interfaces/
│   ├── document-branding.interface.ts
│   ├── payment-document.interface.ts
│   └── pdf.interface.ts
├── layout/
│   └── document-layout.ts
├── reports/
│   └── analytics-report.builder.ts
├── styles/
│   └── base-styles.ts
├── templates/
│   ├── contract.template.ts
│   ├── invoice.template.ts
│   ├── quote.template.ts
│   ├── receipt.template.ts
│   └── reminder.template.ts
├── utils/
│   ├── brand.util.ts
│   ├── embedded-logos.ts
│   ├── format.util.ts
│   ├── payment-document-sections.ts
│   ├── verify-token.util.ts
│   └── verify-url.util.ts
├── index.ts
├── pdf.module.ts
└── pdf.service.ts
```

## Public API (exported from `@nestlancer/pdf`)

Extracted by resolving every `export * from '...'` / `export { ... } from '...'` statement in
`libs/pdf/src/index.ts` and reading the symbol each target file actually declares — this list
is generated from source, not hand-maintained.

### Modules (1)

| Export | Kind | Source |
| --- | --- | --- |
| `PdfModule` | class | `pdf/src/pdf.module.ts` |

### Services (1)

| Export | Kind | Source |
| --- | --- | --- |
| `PdfService` | class | `pdf/src/pdf.service.ts` |

### Interfaces (12)

| Export | Kind | Source |
| --- | --- | --- |
| `PdfGenerateOptions` | interface | `pdf/src/interfaces/pdf.interface.ts` |
| `PdfResult` | interface | `pdf/src/interfaces/pdf.interface.ts` |
| `CompanyBranding` | interface | `pdf/src/interfaces/document-branding.interface.ts` |
| `ClientBranding` | interface | `pdf/src/interfaces/document-branding.interface.ts` |
| `DocumentAudience` | type | `pdf/src/interfaces/document-branding.interface.ts` |
| `DocumentMeta` | interface | `pdf/src/interfaces/document-branding.interface.ts` |
| `InternalMetaCell` | interface | `pdf/src/interfaces/document-branding.interface.ts` |
| `DocumentLayoutOptions` | interface | `pdf/src/interfaces/document-branding.interface.ts` |
| `PaymentScheduleRow` | type | `pdf/src/interfaces/payment-document.interface.ts` |
| `PaymentTransactionRow` | type | `pdf/src/interfaces/payment-document.interface.ts` |
| `PaymentEngagementSummary` | type | `pdf/src/interfaces/payment-document.interface.ts` |
| `PaymentDocumentContext` | type | `pdf/src/interfaces/payment-document.interface.ts` |

### Constants (3)

| Export | Kind | Source |
| --- | --- | --- |
| `PDF_TEMPLATE_VERSION` | const | `pdf/src/constants/template-version.ts` |
| `readPdfTemplateVersion` | function | `pdf/src/constants/template-version.ts` |
| `isPdfTemplateStale` | function | `pdf/src/constants/template-version.ts` |

### Utilities (22)

| Export | Kind | Source |
| --- | --- | --- |
| `BRAND_COLORS` | const | `pdf/src/utils/brand.util.ts` |
| `getLogoFullDataUri` | function | `pdf/src/utils/brand.util.ts` |
| `getLogoIconDataUri` | function | `pdf/src/utils/brand.util.ts` |
| `getLogoFullBuffer` | function | `pdf/src/utils/brand.util.ts` |
| `getLogoIconBuffer` | function | `pdf/src/utils/brand.util.ts` |
| `publicDocumentVerifyUrl` | function | `pdf/src/utils/verify-url.util.ts` |
| `resolveDocumentVerifySecret` | function | `pdf/src/utils/verify-token.util.ts` |
| `createDocumentVerifyToken` | function | `pdf/src/utils/verify-token.util.ts` |
| `isValidDocumentVerifyToken` | function | `pdf/src/utils/verify-token.util.ts` |
| `escapeHtml` | function | `pdf/src/utils/format.util.ts` |
| `formatMoney` | function | `pdf/src/utils/format.util.ts` |
| `formatMoneyCell` | function | `pdf/src/utils/format.util.ts` |
| `formatDisplayDate` | function | `pdf/src/utils/format.util.ts` |
| `formatPaymentMethodLabel` | function | `pdf/src/utils/format.util.ts` |
| `formatPaymentStatusLabel` | function | `pdf/src/utils/format.util.ts` |
| `splitAddressLines` | function | `pdf/src/utils/format.util.ts` |
| `amountInWords` | function | `pdf/src/utils/format.util.ts` |
| `termsToListHtml` | function | `pdf/src/utils/format.util.ts` |
| `buildEngagementSummaryPanel` | function | `pdf/src/utils/payment-document-sections.ts` |
| `buildPaymentScheduleTable` | function | `pdf/src/utils/payment-document-sections.ts` |
| … | | _2 more — see `pdf/src/index.ts`_ |

### Other (21)

| Export | Kind | Source |
| --- | --- | --- |
| `getInvoiceTemplate` | function | `pdf/src/templates/invoice.template.ts` |
| `getReceiptTemplate` | function | `pdf/src/templates/receipt.template.ts` |
| `getQuoteTemplate` | function | `pdf/src/templates/quote.template.ts` |
| `getContractTemplate` | function | `pdf/src/templates/contract.template.ts` |
| `getReminderTemplate` | function | `pdf/src/templates/reminder.template.ts` |
| `resolveAudience` | function | `pdf/src/layout/document-layout.ts` |
| `buildWatermark` | function | `pdf/src/layout/document-layout.ts` |
| `buildAdminBanner` | function | `pdf/src/layout/document-layout.ts` |
| `buildInternalMeta` | function | `pdf/src/layout/document-layout.ts` |
| `buildRunHeader` | function | `pdf/src/layout/document-layout.ts` |
| `buildPageHeader` | const | `pdf/src/layout/document-layout.ts` |
| `buildRunFooter` | function | `pdf/src/layout/document-layout.ts` |
| `buildProjectBanner` | function | `pdf/src/layout/document-layout.ts` |
| `buildGstParties` | function | `pdf/src/layout/document-layout.ts` |
| `buildTotalsPanel` | function | `pdf/src/layout/document-layout.ts` |
| `buildPuppeteerHeaderTemplate` | function | `pdf/src/layout/document-layout.ts` |
| `buildPuppeteerFooterTemplate` | function | `pdf/src/layout/document-layout.ts` |
| `wrapDocumentHtml` | function | `pdf/src/layout/document-layout.ts` |
| `extractLayoutOptions` | function | `pdf/src/layout/document-layout.ts` |
| `buildPageFooter` | function | `pdf/src/layout/document-layout.ts` |
| … | | _1 more — see `pdf/src/index.ts`_ |

## Dependencies

### Workspace (`@nestlancer/*`)

_No internal @nestlancer deps — this is a leaf library other packages can depend on safely._

### External (npm)

- `@nestjs/common` `^10.0.0`
- `@nestjs/config` `^3.1.1`
- `@nestjs/core` `^10.0.0`
- `pdfkit` `^0.13.0`
- `puppeteer` `^22.0.0`
- `rxjs` `^7.8.1`

## How to use in a service

1. Add to the consuming package's `package.json`: `"@nestlancer/pdf": "workspace:*"`
2. Import the symbol(s) you need from `@nestlancer/pdf` (see the Public API tables above for exact names)
3. Register `PdfModule` in the consuming app's root module (or a feature module)

```typescript
import { PdfModule } from '@nestlancer/pdf';

@Module({
  imports: [PdfModule],
})
export class AppModule {}
```

_Example above uses `PdfModule`, a real export of this package (modules defined in `pdf/src/pdf.module.ts`) — the surrounding NestJS wiring is illustrative, not copy-pasted from a specific call site._

## Related documentation

- [Monorepo structure decision](../../decisions/001-monorepo-structure.md)
- [Coding standards](../../development/coding-standards.md)
- [Component index](../README.md)
