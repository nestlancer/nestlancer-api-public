-- Remediate audit findings on an already-seeded database.
-- Run against the Nestlancer Postgres primary (read carefully before applying).
--
-- C1) Force password change + revoke sessions for seeded Nestlancer accounts
--     (unique per-user passwords must be set via app/ops; this blocks shared-secret reuse)
-- C2) Align Payment.invoiceNumber / receiptNumber with GeneratedDocument registry numbers
-- H3/M4) Mark admin unread notifications older than 1 day as read (unread flood hygiene)
-- M5) Mark client unread notifications older than 7 days as read

BEGIN;

-- C1: force reset for known seed emails (admin + @nestlancer.com cohort)
INSERT INTO "AuthConfig" (id, "userId", "mustChangePassword", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, u.id, true, NOW(), NOW()
FROM "User" u
WHERE u."deletedAt" IS NULL
  AND (
    u.email = 'admin@nestlancer.com'
    OR u.email LIKE '%@nestlancer.com'
  )
  AND NOT EXISTS (
    SELECT 1 FROM "AuthConfig" ac WHERE ac."userId" = u.id
  );

UPDATE "AuthConfig" ac
SET
  "mustChangePassword" = true,
  "updatedAt" = NOW()
FROM "User" u
WHERE ac."userId" = u.id
  AND u."deletedAt" IS NULL
  AND (
    u.email = 'admin@nestlancer.com'
    OR u.email LIKE '%@nestlancer.com'
  );

-- Revoke active sessions so stolen shared demo tokens die immediately
DELETE FROM "Session" s
USING "User" u
WHERE s."userId" = u.id
  AND (
    u.email = 'admin@nestlancer.com'
    OR u.email LIKE '%@nestlancer.com'
  );

-- C2: write registry document numbers back onto payments when linked docs exist
UPDATE "Payment" p
SET
  "invoiceNumber" = gd."documentNumber",
  "updatedAt" = NOW()
FROM "GeneratedDocument" gd
WHERE p."currentInvoiceDocumentId" = gd.id
  AND gd."documentType" = 'INVOICE'
  AND (p."invoiceNumber" IS DISTINCT FROM gd."documentNumber");

UPDATE "Payment" p
SET
  "receiptNumber" = gd."documentNumber",
  "updatedAt" = NOW()
FROM "GeneratedDocument" gd
WHERE p."currentReceiptDocumentId" = gd.id
  AND gd."documentType" = 'RECEIPT'
  AND (p."receiptNumber" IS DISTINCT FROM gd."documentNumber");

-- M4: mark admin unread notifications older than 1 day as read
UPDATE "Notification" n
SET
  "readAt" = NOW(),
  "updatedAt" = NOW()
FROM "User" u
WHERE n."userId" = u.id
  AND u.role = 'ADMIN'
  AND n."readAt" IS NULL
  AND n."createdAt" < NOW() - INTERVAL '1 day';

-- M5: mark client unread notifications older than 7 days as read
UPDATE "Notification" n
SET
  "readAt" = NOW(),
  "updatedAt" = NOW()
FROM "User" u
WHERE n."userId" = u.id
  AND u.role <> 'ADMIN'
  AND n."readAt" IS NULL
  AND n."createdAt" < NOW() - INTERVAL '7 days';

COMMIT;
