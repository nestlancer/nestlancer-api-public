import { resolveAudience, wrapDocumentHtml } from '../layout/document-layout';
import { escapeHtml, formatDisplayDate, formatMoney, formatMoneyCell, formatPaymentMethodLabel } from '../utils/format.util';
import { publicDocumentVerifyUrl } from '../utils/verify-url.util';
import {
  buildEngagementSummaryPanel,
  buildPaymentScheduleTable,
  buildTransactionDetailsPanel,
  buildTransactionHistoryTable,
} from '../utils/payment-document-sections';
import type { PaymentDocumentContext } from '../interfaces/payment-document.interface';
import { DocumentLayoutOptions, InternalMetaCell } from '../interfaces/document-branding.interface';

export function getReceiptTemplate(data: Record<string, unknown>): string {
  const audience = resolveAudience(data);
  const company = (data.company as Record<string, string>) || {};
  const client = (data.client as Record<string, string>) || {};
  const receiptNumber = String(data.receiptNumber || 'RCT-000');
  const receiptDate = String(data.receiptDate || new Date().toISOString().split('T')[0]);
  const receiptTime = data.receiptTime ? String(data.receiptTime) : '';
  const amountPaise = Number(data.amountPaise || 0);
  const currency = String(data.currency || 'INR');
  const paymentMethod = formatPaymentMethodLabel(String(data.paymentMethod || 'Online'));
  const transactionId = String(data.transactionId || '');
  const invoiceNumber = String(data.invoiceNumber || '');
  const projectTitle = String(data.projectTitle || '');
  const milestoneName = String(data.milestoneName || '');
  const paymentContext = data.paymentContext as PaymentDocumentContext | undefined;
  const lineDescription =
    milestoneName && projectTitle
      ? `${projectTitle} — ${milestoneName}`
      : projectTitle || milestoneName || 'Project payment';

  const internalMeta: InternalMetaCell[] = Array.isArray(data.internalMeta)
    ? (data.internalMeta as InternalMetaCell[])
    : audience === 'admin'
      ? [
          data.paymentId ? { label: 'Payment ID', value: String(data.paymentId) } : null,
          data.receiptId ? { label: 'Receipt ID', value: String(data.receiptId) } : null,
        ].filter((x): x is InternalMetaCell => x != null)
      : [];

  // NL-BUG-PDF-005: one date line — date + optional time, not duplicated date.
  const dateDisplay = receiptTime
    ? `${formatDisplayDate(receiptDate)}, ${receiptTime}`
    : formatDisplayDate(receiptDate);

  const body = `
  <div class="receipt-hero avoid-break">
    <span class="success-badge">Payment Received</span>
    <p class="receipt-amount">${formatMoney(amountPaise, currency)}</p>
    <p class="receipt-amount-label">Total Amount Paid (incl. GST)</p>
    ${
      paymentContext?.engagement.paymentSequenceLabel
        ? `<p class="receipt-phase-label">${escapeHtml(paymentContext.engagement.paymentSequenceLabel)}${
            paymentContext.engagement.currentMilestoneName
              ? ` · ${escapeHtml(paymentContext.engagement.currentMilestoneName)}`
              : ''
          }</p>`
        : milestoneName
          ? `<p class="receipt-phase-label">${escapeHtml(milestoneName)}</p>`
          : ''
    }
  </div>

  ${paymentContext ? buildEngagementSummaryPanel(paymentContext.engagement, currency) : ''}

  ${paymentContext ? buildTransactionDetailsPanel(paymentContext, currency, amountPaise, { documentNumber: receiptNumber, documentType: 'Receipt' }) : ''}

  ${paymentContext ? buildPaymentScheduleTable(paymentContext.paymentSchedule, currency) : ''}

  <table class="data-table avoid-break" style="margin-bottom:20px">
    <thead>
      <tr>
        <th style="width:5%">#</th>
        <th>Description</th>
        <th class="amount" style="width:18%">Amount (₹)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td>${escapeHtml(lineDescription)}</td>
        <td class="amount">${formatMoneyCell(amountPaise, currency)}</td>
      </tr>
    </tbody>
  </table>

  <div class="detail-panel avoid-break">
    <div class="detail-row"><span class="detail-label">Received From</span><span class="detail-value">${escapeHtml(client.name || '')}</span></div>
    ${projectTitle ? `<div class="detail-row"><span class="detail-label">Project</span><span class="detail-value">${escapeHtml(projectTitle)}</span></div>` : ''}
    ${paymentContext?.engagement.contractReference ? `<div class="detail-row"><span class="detail-label">Contract / quote no.</span><span class="detail-value">${escapeHtml(paymentContext.engagement.contractReference)}</span></div>` : ''}
    ${paymentContext?.engagement.currentPhaseLabel ? `<div class="detail-row"><span class="detail-label">Milestone phase</span><span class="detail-value">${escapeHtml(paymentContext.engagement.currentPhaseLabel)}</span></div>` : ''}
    ${invoiceNumber || paymentContext?.invoiceNumber ? `<div class="detail-row"><span class="detail-label">Invoice no.</span><span class="detail-value">${escapeHtml(invoiceNumber || paymentContext?.invoiceNumber || '')}</span></div>` : ''}
    <div class="detail-row"><span class="detail-label">Receipt no.</span><span class="detail-value">${escapeHtml(receiptNumber)}</span></div>
    <div class="detail-row"><span class="detail-label">Payment method</span><span class="detail-value">${escapeHtml(paymentMethod)}</span></div>
    ${transactionId ? `<div class="detail-row"><span class="detail-label">Bank / gateway ref.</span><span class="detail-value ref-mono">${escapeHtml(transactionId)}</span></div>` : ''}
    ${paymentContext?.transactionRef ? `<div class="detail-row"><span class="detail-label">Payment reference</span><span class="detail-value">${escapeHtml(paymentContext.transactionRef)}</span></div>` : ''}
    ${paymentContext?.paymentId ? `<div class="detail-row"><span class="detail-label">Nestlancer payment ID</span><span class="detail-value ref-mono">${escapeHtml(paymentContext.paymentId)}</span></div>` : ''}
    <div class="detail-row amount-row"><span class="detail-label">Amount Paid</span><span class="detail-value">${formatMoney(amountPaise, currency)}</span></div>
  </div>

  ${paymentContext ? buildTransactionHistoryTable(paymentContext.transactionHistory, currency) : ''}

  ${
    audience === 'admin' && data.providerDetails
      ? `<div class="admin-panel avoid-break">
          <h4>Provider Details</h4>
          <pre style="margin:0;font-size:9px;white-space:pre-wrap">${escapeHtml(JSON.stringify(data.providerDetails, null, 2))}</pre>
        </div>`
      : ''
  }

  <p style="margin:20px 0 0;font-size:10px;text-align:center;color:var(--muted)">This receipt confirms payment has been received in full for the above services. Your tax invoice is available in the Invoices section of your dashboard.</p>`;

  const layout: DocumentLayoutOptions = {
    audience,
    company: {
      ...company,
      legalName: company.gst
        ? `${company.legalName || company.name || 'Nestlancer'} · GSTIN ${company.gst}`
        : company.legalName || company.name,
    },
    client,
    internalMeta: internalMeta.length ? internalMeta : undefined,
    meta: {
      documentType: 'Receipt',
      documentNumber: receiptNumber,
      date: dateDisplay,
      verificationUrl: publicDocumentVerifyUrl(receiptNumber),
      notes: 'Thank you for your payment. This is a computer-generated document.',
    },
  };

  return wrapDocumentHtml(body, layout);
}
