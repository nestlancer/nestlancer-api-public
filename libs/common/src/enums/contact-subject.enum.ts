/**
 * Must match the Postgres `ContactSubject` enum in prisma/schema/contact.prisma.
 * Public contact forms submit SALES and BILLING; older rows may still be BUG_REPORT or OTHER.
 */
export enum ContactSubject {
  GENERAL = 'GENERAL',
  SUPPORT = 'SUPPORT',
  SALES = 'SALES',
  BILLING = 'BILLING',
  PARTNERSHIP = 'PARTNERSHIP',
  BUG_REPORT = 'BUG_REPORT',
  OTHER = 'OTHER',
}
