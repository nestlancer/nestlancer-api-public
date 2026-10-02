-- =============================================================================
-- Business-rule CHECK constraints (Prisma-unsupported)
-- Source of truth — appended to *_init/migration.sql by scripts/db/append-prisma-sql.sh
-- after `prisma migrate diff --from-empty`. Do not edit migration.sql by hand.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Range constraints (0-100 / 1-5)
-- ---------------------------------------------------------------------------
ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_rolloutPercentage_check"
  CHECK ("rolloutPercentage" >= 0 AND "rolloutPercentage" <= 100);

ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_progress_check"
  CHECK ("progress" >= 0 AND "progress" <= 100);

ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_percentage_check"
  CHECK ("percentage" IS NULL OR ("percentage" >= 0 AND "percentage" <= 100));

ALTER TABLE "Project" ADD CONSTRAINT "Project_overallProgress_check"
  CHECK ("overallProgress" >= 0 AND "overallProgress" <= 100);

ALTER TABLE "ProjectShowcaseConsent" ADD CONSTRAINT "ProjectShowcaseConsent_rating_check"
  CHECK ("rating" IS NULL OR ("rating" >= 1 AND "rating" <= 5));

-- ---------------------------------------------------------------------------
-- Message context exclusivity — exactly one of projectId / threadId must be set
-- ---------------------------------------------------------------------------
ALTER TABLE "Message" ADD CONSTRAINT "Message_context_check"
  CHECK (
    ("projectId" IS NOT NULL AND "threadId" IS NULL) OR
    ("projectId" IS NULL  AND "threadId" IS NOT NULL)
  );

-- ---------------------------------------------------------------------------
-- Non-negative monetary / count constraints
-- ---------------------------------------------------------------------------
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_amount_check"
  CHECK ("amount" IS NULL OR "amount" >= 0);

ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_revisionCount_check"
  CHECK ("revisionCount" >= 0);

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amount_check"
  CHECK ("amount" >= 0);

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amountRefunded_check"
  CHECK ("amountRefunded" >= 0);

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_lateFeePaise_check"
  CHECK ("lateFeePaise" >= 0);

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_reminderCount_check"
  CHECK ("reminderCount" >= 0);

ALTER TABLE "Quote" ADD CONSTRAINT "Quote_subtotal_check"
  CHECK ("subtotal" >= 0);

ALTER TABLE "Quote" ADD CONSTRAINT "Quote_taxAmount_check"
  CHECK ("taxAmount" >= 0);

ALTER TABLE "Quote" ADD CONSTRAINT "Quote_totalAmount_check"
  CHECK ("totalAmount" >= 0);

ALTER TABLE "Refund" ADD CONSTRAINT "Refund_amount_check"
  CHECK ("amount" >= 0);

ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_amount_check"
  CHECK ("amount" >= 0);

ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_durationMinutes_check"
  CHECK ("durationMinutes" > 0);

ALTER TABLE "Media" ADD CONSTRAINT "Media_size_check"
  CHECK ("size" >= 0);

ALTER TABLE "User" ADD CONSTRAINT "User_totalProjectsCompleted_check"
  CHECK ("totalProjectsCompleted" >= 0);

ALTER TABLE "User" ADD CONSTRAINT "User_totalSpentPaise_check"
  CHECK ("totalSpentPaise" >= 0);

ALTER TABLE "User" ADD CONSTRAINT "User_creditBalancePaise_check"
  CHECK ("creditBalancePaise" >= 0);

ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_viewCount_check"
  CHECK ("viewCount" >= 0);

ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_likeCount_check"
  CHECK ("likeCount" >= 0);

ALTER TABLE "PortfolioItem" ADD CONSTRAINT "PortfolioItem_likeCount_check"
  CHECK ("likeCount" >= 0);

ALTER TABLE "PortfolioItem" ADD CONSTRAINT "PortfolioItem_viewCount_check"
  CHECK ("viewCount" >= 0);

ALTER TABLE "RequestAttachment" ADD CONSTRAINT "RequestAttachment_size_check"
  CHECK ("size" >= 0);

ALTER TABLE "DocumentSequence" ADD CONSTRAINT "DocumentSequence_lastNumber_check"
  CHECK ("lastNumber" >= 0);

-- ---------------------------------------------------------------------------
-- Phase-2 optional constraints (all columns verified to exist in schema)
-- ---------------------------------------------------------------------------
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_versionNumber_check"
  CHECK ("versionNumber" >= 1);

ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_fileSize_check"
  CHECK ("fileSize" IS NULL OR "fileSize" >= 0);

ALTER TABLE "Outbox" ADD CONSTRAINT "Outbox_retries_check"
  CHECK ("retries" >= 0);

ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_estimatedHours_check"
  CHECK ("estimatedHours" IS NULL OR "estimatedHours" >= 0);

ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_actualHours_check"
  CHECK ("actualHours" IS NULL OR "actualHours" >= 0);

ALTER TABLE "Quote" ADD CONSTRAINT "Quote_taxPercentage_check"
  CHECK ("taxPercentage" >= 0);

ALTER TABLE "Quote" ADD CONSTRAINT "Quote_viewCount_check"
  CHECK ("viewCount" >= 0);

ALTER TABLE "QuoteLineItemBlock" ADD CONSTRAINT "QuoteLineItemBlock_defaultUnitPricePaise_check"
  CHECK ("defaultUnitPricePaise" >= 0);

ALTER TABLE "QuoteLineItemBlock" ADD CONSTRAINT "QuoteLineItemBlock_defaultQuantity_check"
  CHECK ("defaultQuantity" > 0);

ALTER TABLE "ServicePackage" ADD CONSTRAINT "ServicePackage_basePricePaise_check"
  CHECK ("basePricePaise" >= 0);

ALTER TABLE "ServicePackage" ADD CONSTRAINT "ServicePackage_estimatedDays_check"
  CHECK ("estimatedDays" > 0);

ALTER TABLE "AuthConfig" ADD CONSTRAINT "AuthConfig_failedLoginAttempts_check"
  CHECK ("failedLoginAttempts" >= 0);

ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_attempts_check"
  CHECK ("attempts" >= 1);
