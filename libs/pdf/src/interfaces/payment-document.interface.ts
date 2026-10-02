export type PaymentScheduleRow = {
  sequence: number;
  name: string;
  amountPaise: number;
  status: 'paid' | 'current' | 'due' | 'pending';
  statusLabel: string;
  /** Best display reference for this installment (receipt, invoice, UTR, or payment id). */
  transactionRef?: string;
  invoiceNumber?: string;
  receiptNumber?: string;
  paidAt?: string;
  paymentId?: string;
  isCurrent: boolean;
};

export type PaymentTransactionRow = {
  sequence: number;
  date: string;
  amountPaise: number;
  milestoneName: string;
  transactionRef: string;
  invoiceNumber?: string;
  receiptNumber?: string;
  paymentId: string;
  isCurrent: boolean;
};

export type PaymentEngagementSummary = {
  projectId: string;
  projectTitle: string;
  /** Official contract / quote number when assigned. */
  contractReference?: string;
  quoteNumber?: string;
  currentMilestoneName?: string;
  currentPhaseLabel?: string;
  paymentSequenceLabel?: string;
  contractValuePaise: number;
  totalPaidPaise: number;
  totalPendingPaise: number;
  completedPaymentsCount: number;
  schedulePaymentsCount: number;
};

export type PaymentDocumentContext = {
  paymentId: string;
  paymentStatus: string;
  paymentMethod?: string;
  invoiceNumber?: string;
  receiptNumber?: string;
  transactionId?: string;
  /** Primary human-facing payment reference for this document. */
  transactionRef: string;
  paidAt?: string;
  paidAtDisplay?: string;
  paymentRequestedAt?: string;
  engagement: PaymentEngagementSummary;
  paymentSchedule: PaymentScheduleRow[];
  transactionHistory: PaymentTransactionRow[];
};
