export interface CompanyBranding {
  name?: string;
  legalName?: string;
  address?: string;
  state?: string;
  stateCode?: string;
  gst?: string;
  pan?: string;
  cin?: string;
  email?: string;
  phone?: string;
  website?: string;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  upi?: string;
}

export interface ClientBranding {
  name?: string;
  email?: string;
  address?: string;
  state?: string;
  stateCode?: string;
  gstin?: string | null;
}

export type DocumentAudience = 'client' | 'admin';

export interface DocumentMeta {
  documentType: string;
  documentNumber: string;
  date?: string;
  extraLines?: string[];
  verificationUrl?: string;
  notes?: string;
  status?: string;
  generatedAt?: string;
  triggerEvent?: string;
}

export interface InternalMetaCell {
  label: string;
  value: string;
}

export interface DocumentLayoutOptions {
  audience?: DocumentAudience;
  company: CompanyBranding;
  client?: ClientBranding;
  meta: DocumentMeta;
  projectTitle?: string;
  projectBannerLabel?: string;
  internalMeta?: InternalMetaCell[];
  /** Skip the global run-header — template renders its own (e.g. tax invoice). */
  suppressRunHeader?: boolean;
  /** Extra class on body for document-specific print tuning. */
  documentClass?: string;
  /** Use compact run-header (smaller logo/type) — helps single-page quotes. */
  compactHeader?: boolean;
  /** Render project as a single line instead of the gradient banner. */
  compactProject?: boolean;
}
