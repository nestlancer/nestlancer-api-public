import { resolveAudience, wrapDocumentHtml } from '../layout/document-layout';
import { escapeHtml, formatDisplayDate, formatMoney } from '../utils/format.util';
import { publicDocumentVerifyUrl } from '../utils/verify-url.util';
import { DocumentLayoutOptions, InternalMetaCell } from '../interfaces/document-branding.interface';

export function getReminderTemplate(data: Record<string, unknown>): string {
  const audience = resolveAudience(data);
  const company = (data.company as Record<string, string>) || {};
  const client = (data.client as Record<string, string>) || {};
  const reminderNumber = String(data.reminderNumber || 'REM-000');
  const dueDate = String(data.dueDate || '');
  const amountPaise = Number(data.amountPaise || 0);
  const currency = String(data.currency || 'INR');
  const invoiceNumber = String(data.invoiceNumber || '');
  const projectTitle = String(data.projectTitle || '');
  const reminderCount = data.reminderCount != null ? Number(data.reminderCount) : undefined;

  const internalMeta: InternalMetaCell[] = Array.isArray(data.internalMeta)
    ? (data.internalMeta as InternalMetaCell[])
    : audience === 'admin' && reminderCount != null
      ? [{ label: 'Reminder Count', value: String(reminderCount) }]
      : [];

  const body = `
  <p style="font-size:12px;margin-bottom:16px">Dear <strong>${escapeHtml(client.name || 'Client')}</strong>,</p>
  <p style="margin:0 0 16px">This is a reminder that payment is due for your active project. Please complete payment by the due date to avoid delays.</p>

  <div class="alert-box avoid-break">
    <p style="margin:0 0 6px;font-weight:700;font-size:11px">Outstanding Payment</p>
    ${projectTitle ? `<p style="margin:0"><strong>${escapeHtml(projectTitle)}</strong></p>` : ''}
    <p class="alert-amount">${formatMoney(amountPaise, currency)}</p>
    ${dueDate ? `<p style="margin:0">Due by: <strong>${escapeHtml(formatDisplayDate(dueDate))}</strong></p>` : ''}
    ${invoiceNumber ? `<p style="margin:8px 0 0;font-size:10px;color:var(--muted)">Invoice: ${escapeHtml(invoiceNumber)}</p>` : ''}
  </div>

  <div class="callout avoid-break">
    <p><strong>How to pay:</strong> Dashboard → Payments${invoiceNumber ? ` → Invoice <strong>${escapeHtml(invoiceNumber)}</strong>` : ''}. UPI, card, or bank transfer accepted.</p>
  </div>

  <p style="font-size:10px;color:var(--muted)">If you have already paid, please disregard this notice (processing may take up to 24 hours). Contact <strong>${escapeHtml(company.email || 'hello@nestlancer.com')}</strong>${company.phone ? ` or ${escapeHtml(company.phone)}` : ''} for help.</p>`;

  const layout: DocumentLayoutOptions = {
    audience,
    company,
    client,
    internalMeta: internalMeta.length ? internalMeta : undefined,
    meta: {
      documentType: 'Reminder',
      documentNumber: reminderNumber,
      verificationUrl: publicDocumentVerifyUrl(reminderNumber),
      notes: company.email
        ? `${company.email}${company.phone ? ` · ${company.phone}` : ''}`
        : undefined,
    },
  };

  return wrapDocumentHtml(body, layout);
}
