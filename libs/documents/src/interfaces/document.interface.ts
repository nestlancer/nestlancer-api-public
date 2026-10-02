import { DocumentType } from '@prisma/client';

export interface GenerateDocumentOptions {
  documentType: DocumentType;
  entityType: string;
  entityId: string;
  template: string;
  templateData: Record<string, unknown>;
  issuedToUserId?: string;
  triggeredByEvent?: string;
  triggeredByUserId?: string;
  changeReason?: string;
  isImmutable?: boolean;
  metadata?: Record<string, unknown>;
  forceNewVersion?: boolean;
  /** Regenerate immutable documents when the PDF template version is stale (supersedes prior version). */
  repairImmutableTemplate?: boolean;
}

export interface GeneratedDocumentResult {
  id: string;
  documentNumber: string;
  documentType: DocumentType;
  versionNumber: number;
  storageBucket: string;
  storageKey: string;
  downloadUrl: string;
  fileHash: string;
  isLatest: boolean;
}

export interface DocumentVersionInfo {
  id: string;
  documentNumber: string;
  versionNumber: number;
  documentType: DocumentType;
  issuedAt: Date;
  changeReason: string | null;
  isLatest: boolean;
  isImmutable: boolean;
  downloadUrl?: string;
}

export interface DocumentDownloadResult {
  id: string;
  documentNumber: string;
  versionNumber: number;
  documentType: DocumentType;
  downloadUrl: string;
  filename: string;
  expiresIn: number;
}

export const DOCUMENT_TYPE_PREFIX: Record<DocumentType, string> = {
  QUOTE: 'NL-QTE',
  CONTRACT: 'NL-CTR',
  INVOICE: 'NL-INV',
  RECEIPT: 'NL-RCPT',
  REMINDER: 'NL-REM',
  REPORT: 'NL-RPT',
  EXPORT_GDPR: 'NL-EXP-GDPR',
  EXPORT_PROJECT: 'NL-EXP-PRJ',
  EXPORT_AUDIT: 'NL-EXP-AUD',
  EXPORT_REVENUE: 'NL-EXP-REV',
  EXPORT_LOGS: 'NL-EXP-LOG',
};

export const DOCUMENT_BUCKET_MAP: Record<DocumentType, string> = {
  QUOTE: 'STORAGE_BUCKET_QUOTES',
  CONTRACT: 'STORAGE_BUCKET_PDFS',
  INVOICE: 'STORAGE_BUCKET_PDFS',
  RECEIPT: 'STORAGE_BUCKET_PDFS',
  REMINDER: 'STORAGE_BUCKET_PDFS',
  REPORT: 'STORAGE_BUCKET_REPORTS',
  EXPORT_GDPR: 'STORAGE_BUCKET_PRIVATE',
  EXPORT_PROJECT: 'STORAGE_BUCKET_PRIVATE',
  EXPORT_AUDIT: 'STORAGE_BUCKET_PRIVATE',
  EXPORT_REVENUE: 'STORAGE_BUCKET_PRIVATE',
  EXPORT_LOGS: 'STORAGE_BUCKET_PRIVATE',
};

export const DOCUMENT_STORAGE_PREFIX: Record<DocumentType, string> = {
  QUOTE: 'quotes',
  CONTRACT: 'contracts',
  INVOICE: 'invoices',
  RECEIPT: 'receipts',
  REMINDER: 'reminders',
  REPORT: 'reports',
  EXPORT_GDPR: 'exports/gdpr',
  EXPORT_PROJECT: 'exports/projects',
  EXPORT_AUDIT: 'exports/audit',
  EXPORT_REVENUE: 'exports/revenue',
  EXPORT_LOGS: 'exports/logs',
};
