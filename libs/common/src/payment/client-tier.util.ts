/** Client tier discount percentages applied at quote creation. */
export const CLIENT_TIER_DISCOUNTS: Record<string, number> = {
  NEW: 0,
  RETURNING: 5,
  VIP: 10,
};

export function resolveClientTierDiscount(tier: string): number {
  return CLIENT_TIER_DISCOUNTS[tier] ?? 0;
}

/** Upgrade thresholds for automatic tier promotion on project completion. */
export const TIER_UPGRADE_RULES = {
  RETURNING_MIN_PROJECTS: 3,
  VIP_MIN_SPENT_PAISE: 1_000_000, // ₹10,000
};
