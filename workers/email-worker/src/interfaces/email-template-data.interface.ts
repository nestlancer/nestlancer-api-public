export interface BaseEmailData {
  userName: string;
  currentYear: number;
  companyName: string;
  supportEmail: string;
  logoUrl: string;
  siteUrl?: string;
  preheader?: string;
}

export interface VerificationEmailData extends BaseEmailData {
  verificationUrl: string;
  expiresIn: string;
}

export interface PasswordResetEmailData extends BaseEmailData {
  resetUrl: string;
  expiresIn: string;
  ipAddress?: string;
}

export interface WelcomeEmailData extends BaseEmailData {
  loginUrl: string;
}

export interface NotificationEmailData extends BaseEmailData {
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
}

export interface QuoteEmailData extends BaseEmailData {
  quoteId: string;
  amount: number;
  currency: string;
  expiryDate: string;
  viewUrl: string;
}

export interface PaymentEmailData extends BaseEmailData {
  transactionId: string;
  amount: number;
  currency: string;
  paymentDate: string;
  receiptUrl?: string;
}

export interface ProjectEmailData extends BaseEmailData {
  projectId: string;
  projectName: string;
  status: string;
  updateMessage?: string;
  viewUrl: string;
}

export interface ContactResponseEmailData extends BaseEmailData {
  adminResponse: string;
  originalMessage: string;
}

export interface AnnouncementEmailData extends BaseEmailData {
  title: string;
  content: string;
  unsubscribeUrl: string;
}
