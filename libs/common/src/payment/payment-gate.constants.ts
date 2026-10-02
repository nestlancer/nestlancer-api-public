/** Business error codes for payment gating (PAYMENT_GATE_*). */
export const PAYMENT_GATE_ERROR = {
  MILESTONE_NOT_APPROVED: 'PAYMENT_GATE_001',
  DEPOSIT_REQUIRED: 'PAYMENT_GATE_002',
  PAYMENT_ALREADY_COMPLETED: 'PAYMENT_GATE_003',
  PAYMENT_NOT_REQUESTED: 'PAYMENT_GATE_004',
  PROJECT_ACCESS_DENIED: 'PAYMENT_GATE_005',
  MILESTONE_NOT_FOUND: 'PAYMENT_GATE_006',
  INVALID_MILESTONE_AMOUNT: 'PAYMENT_GATE_007',
  DELIVERY_BLOCKED_DEPOSIT: 'PAYMENT_GATE_008',
  MILESTONE_NOT_READY_FOR_PAYMENT_REQUEST: 'PAYMENT_GATE_009',
  CONTRACT_REQUIRED: 'PAYMENT_GATE_010',
  UNPAID_MILESTONES: 'PAYMENT_GATE_011',
  /** Deposit milestones are pay-only — no delivery submit / approve / request-payment. */
  DEPOSIT_DELIVERY_NOT_ALLOWED: 'PAYMENT_GATE_012',
  /** Admin verify requires a gateway transaction or an in-flight payment. */
  PAYMENT_NOT_VERIFIABLE: 'PAYMENT_GATE_013',
  /** Later milestones are locked until the current phase is paid or reviewed. */
  MILESTONE_PHASE_LOCKED: 'PAYMENT_GATE_014',
  /** Offline transfer submit blocked (open Razorpay intent, invalid proof, etc.). */
  OFFLINE_TRANSFER_BLOCKED: 'PAYMENT_GATE_015',
  /** Platform settlement account missing or inactive. */
  PLATFORM_ACCOUNT_UNAVAILABLE: 'PAYMENT_GATE_016',
  /** Offline transfer not in PENDING_VERIFICATION. */
  TRANSFER_NOT_PENDING_VERIFICATION: 'PAYMENT_GATE_017',
  /** Razorpay rejected the order (mapped from a provider error — never a raw 500). */
  PROVIDER_REJECTED: 'PAYMENT_GATE_018',
  /** Same UTR / transfer reference already attached to another in-flight or completed payment. */
  DUPLICATE_TRANSFER_REFERENCE: 'PAYMENT_GATE_019',
  /** Client dispute on COMPLETED requires a gateway dispute id (disp_*).
   * Unauthenticated self-service flips are rejected (NL-BUG-DISP-001).
   * Open disputes keep collected revenue until resolve=refund. */
  DISPUTE_INVALID_STATUS: 'PAYMENT_GATE_020',
  /** An open dispute already exists for this payment. */
  DISPUTE_ALREADY_OPEN: 'PAYMENT_GATE_021',
  /** Saved card token missing or not a verified Razorpay token id. */
  INVALID_PAYMENT_METHOD_TOKEN: 'PAYMENT_GATE_022',
} as const;
