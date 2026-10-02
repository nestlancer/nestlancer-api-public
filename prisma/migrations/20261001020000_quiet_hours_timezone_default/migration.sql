-- Align quiet-hours default with account timezone (Asia/Kolkata).
-- Existing rows that never configured quiet hours still show UTC in the UI; the
-- preferences service surfaces the account timezone when quiet hours are unset.

ALTER TABLE "NotificationPreference"
  ALTER COLUMN "quietHoursTimezone" SET DEFAULT 'Asia/Kolkata';
