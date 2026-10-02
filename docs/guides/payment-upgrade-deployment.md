# Payment upgrade — deployment checklist

## Database migration

Apply migration `20260602120000_payment_gating_milestone_review`:

```bash
pnpm exec prisma migrate deploy
pnpm exec prisma generate
```

## Environment variables

| Variable                          | Default    | Purpose                                       |
| :-------------------------------- | :--------- | :-------------------------------------------- |
| `APPROVAL_WINDOW_DAYS`            | `7`        | Client review window before deemed acceptance |
| `MILESTONE_REVIEW_CRON_MS`        | `3600000`  | Deemed-accept scheduler interval              |
| `PAYMENT_REMINDER_AFTER_DAYS`     | `3`        | Days after request before first reminder      |
| `PAYMENT_REMINDER_MAX_COUNT`      | `3`        | Max reminders per payment                     |
| `PAYMENT_REMINDER_CRON_MS`        | `86400000` | Reminder scheduler interval                   |
| `PAYMENT_DEFAULT_UPFRONT_PERCENT` | `50`       | Default quote split when breakdown empty      |
| `RAZORPAY_KEY_ID`                 | —          | Razorpay test/live key                        |
| `RAZORPAY_KEY_SECRET`             | —          | Razorpay secret                               |
| `RAZORPAY_WEBHOOK_SECRET`         | —          | Must match Razorpay Dashboard webhook secret  |

## Razorpay webhook (dev)

- URL: `https://dev.nestlancer.com/api/v1/webhooks/razorpay`
- Gateway route: `POST /api/v1/webhooks/razorpay` → webhooks service
- Verify `RAZORPAY_WEBHOOK_SECRET` in Infisical matches the Dashboard secret for this endpoint

If the endpoint returns **502**, the gateway or webhooks service is down behind `dev.nestlancer.com` — fix infra before testing live webhooks.

## Smoke test (after deploy)

1. Accept quote → pay deposit (milestone order 1).
2. Admin submits milestone for approval (blocked until deposit paid).
3. Client approves → admin requests payment → client pays.
4. Confirm `PAYMENT_COMPLETED` outbox and project stays `IN_PROGRESS`.
