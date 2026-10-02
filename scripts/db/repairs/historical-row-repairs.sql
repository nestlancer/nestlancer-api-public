-- One-time row repairs that used to live in Prisma migrations.
-- Prisma migrate diff does not emit UPDATE/INSERT/DELETE, so they are not part of
-- prisma/migrations/*_init/migration.sql.
--
-- These statements target specific historical rows. A fresh database has none of
-- them, so init correctly skips this file. Apply only on a database that still
-- has the bad rows and has not already run the old migration names:
--   20260809100000_chat_thread_member_stints
--   20260912183000_repair_audit_money_notes_quote_events
--   20260912183500_invalidate_repaired_invoice_pdfs
--
-- The QUOTE_ACCEPTED uniqueness rule is schema, not a repair. It is
-- Outbox.@@unique in prisma/schema/outbox.prisma
-- (index Outbox_quote_accepted_once).

BEGIN;

-- Backfill membership stints that existed before ChatThreadMemberStint.
INSERT INTO "ChatThreadMemberStint" ("id", "threadId", "userId", "joinedAt", "leftAt", "leftReason", "userSentMessage")
SELECT
    gen_random_uuid()::text,
    ctm."threadId",
    ctm."userId",
    ctm."joinedAt",
    NULL,
    NULL,
    EXISTS (
        SELECT 1
        FROM "Message" m
        WHERE m."threadId" = ctm."threadId"
          AND m."senderId" = ctm."userId"
          AND m."deletedAt" IS NULL
    )
FROM "ChatThreadMember" ctm
WHERE NOT EXISTS (
    SELECT 1
    FROM "ChatThreadMemberStint" s
    WHERE s."threadId" = ctm."threadId"
      AND s."userId" = ctm."userId"
      AND s."leftAt" IS NULL
);

-- NL-PAY-014: one agent quote stored rupees as paise (4000 instead of 400000).
UPDATE "Quote"
SET
  "totalAmount" = 400000,
  "subtotal" = 400000,
  "paymentBreakdown" = (
    SELECT jsonb_agg(
      jsonb_set(elem, '{amount}', to_jsonb(((elem->>'amount')::numeric * 100)::int))
      ORDER BY ord
    )
    FROM jsonb_array_elements("paymentBreakdown"::jsonb) WITH ORDINALITY AS t(elem, ord)
  ),
  "paymentSchedule" = (
    SELECT jsonb_agg(
      CASE
        WHEN elem ? 'amountPaise' THEN
          jsonb_set(elem, '{amountPaise}', to_jsonb(((elem->>'amountPaise')::numeric * 100)::int))
        ELSE elem
      END
      ORDER BY ord
    )
    FROM jsonb_array_elements("paymentSchedule"::jsonb) WITH ORDINALITY AS t(elem, ord)
  )
WHERE id = '01a0948b-12a1-73df-8117-df396700f93b'
  AND "totalAmount" = 4000
  AND "subtotal" = 4000;

UPDATE "Milestone"
SET "amount" = "amount" * 100
WHERE "projectId" = '01a0948c-1c41-77ec-a739-848627d20133'
  AND "amount" = 2000;

UPDATE "Payment"
SET "amount" = "amount" * 100
WHERE "projectId" = '01a0948c-1c41-77ec-a739-848627d20133'
  AND "amount" = 2000;

-- Stop leaking staff UUIDs in client invoice notes. Keep the operator on verifiedById.
UPDATE "Payment"
SET
  "verifiedById" = COALESCE(
    "verifiedById",
    substring("customNotes" from '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})')
  ),
  "customNotes" = 'Recorded by support'
WHERE "customNotes" ~* '^Manual payment by admin [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Drop duplicate QUOTE_ACCEPTED outbox rows before the partial unique index can be added on a dirty database.
DELETE FROM "Outbox" AS extra
USING "Outbox" AS kept
WHERE extra.type = 'QUOTE_ACCEPTED'
  AND kept.type = 'QUOTE_ACCEPTED'
  AND extra."aggregateId" = kept."aggregateId"
  AND extra."aggregateId" IS NOT NULL
  AND (
    extra."createdAt" > kept."createdAt"
    OR (extra."createdAt" = kept."createdAt" AND extra.id > kept.id)
  );

-- Mark repaired invoice/receipt PDFs stale so the next download rebuilds them.
UPDATE "GeneratedDocument"
SET "isLatest" = false
WHERE "entityType" = 'PAYMENT'
  AND "entityId" IN (
    '01a0948c-1dd7-71d7-a550-caef829d1af8',
    '01a0948c-1dd7-71d7-a550-ccf5cb344501',
    '01a09434-b038-7355-84d8-595e308f201d',
    '01a09434-b088-73ae-81c9-008b338d821f'
  )
  AND "isLatest" = true;

COMMIT;
