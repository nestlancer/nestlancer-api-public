-- Align Payment.clientId with owning Project.clientId (NL-DATA-001).
-- Run against Postgres primary after verifying row counts in the SELECT preview.

BEGIN;

-- Preview mismatches before applying
-- SELECT p.id, p."clientId" AS payment_client_id, pr."clientId" AS project_client_id, u.email
-- FROM "Payment" p
-- JOIN "Project" pr ON pr.id = p."projectId"
-- JOIN "User" u ON u.id = pr."clientId"
-- WHERE p."clientId" IS DISTINCT FROM pr."clientId";

UPDATE "Payment" p
SET
  "clientId" = pr."clientId",
  "updatedAt" = NOW()
FROM "Project" pr
WHERE p."projectId" = pr.id
  AND p."clientId" IS DISTINCT FROM pr."clientId";

COMMIT;
