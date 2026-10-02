import { buildGstParties, resolveAudience, wrapDocumentHtml } from '../layout/document-layout';
import {
  amountInWords,
  escapeHtml,
  formatDisplayDate,
  formatMoney,
  formatMoneyCell,
  termsToListHtml,
} from '../utils/format.util';
import { publicDocumentVerifyUrl } from '../utils/verify-url.util';
import { DocumentLayoutOptions, InternalMetaCell } from '../interfaces/document-branding.interface';

function formatPaymentDueTrigger(trigger: unknown): string {
  const key = String(trigger ?? '').toLowerCase();
  switch (key) {
    case 'on_accept':
      return 'On quote acceptance';
    case 'on_prior_approved':
      return 'After prior milestone approval';
    case 'on_date':
      return 'On scheduled date';
    default:
      return key ? key.replace(/_/g, ' ') : '—';
  }
}

function buildScopeTable(items: Array<Record<string, unknown>>, currency: string): string {
  if (!items.length) return '';
  const rows = items
    .map(
      (item, index) => `<tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(String(item.description || ''))}</td>
      <td class="qty">${escapeHtml(item.quantity ?? 1)}</td>
      <td class="amount">${formatMoneyCell(Number(item.unitPricePaise || 0), currency)}</td>
      <td class="amount">${formatMoneyCell(Number(item.totalPaise || 0), currency)}</td>
    </tr>`,
    )
    .join('');
  return `<p class="section-title">Statement of Work — Deliverables</p>
    <table class="data-table data-table--compact avoid-break">
      <thead>
        <tr>
          <th style="width:4%">#</th>
          <th>Description</th>
          <th class="qty" style="width:8%">Qty</th>
          <th class="amount" style="width:14%">Rate</th>
          <th class="amount" style="width:14%">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function buildPaymentScheduleTable(
  schedule: Array<Record<string, unknown>>,
  currency: string,
): string {
  if (!schedule.length) return '';
  const rows = schedule
    .slice()
    .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
    .map((entry, index) => {
      const amountPaise = Number(entry.amountPaise ?? entry.amount ?? 0);
      const percentage = entry.percentage != null ? `${entry.percentage}%` : '—';
      return `<tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(String(entry.label || 'Installment'))}</td>
        <td class="qty">${escapeHtml(percentage)}</td>
        <td class="amount">${formatMoneyCell(amountPaise, currency)}</td>
        <td>${escapeHtml(formatPaymentDueTrigger(entry.dueTrigger))}</td>
      </tr>`;
    })
    .join('');
  return `<p class="section-title">Payment Schedule</p>
    <table class="data-table data-table--compact avoid-break">
      <thead>
        <tr>
          <th style="width:4%">#</th>
          <th>Installment</th>
          <th class="qty" style="width:10%">Share</th>
          <th class="amount" style="width:14%">Amount</th>
          <th style="width:24%">Due</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function buildTermsSection(msaTerms: string, sowTerms: string): string {
  let html = '';
  if (msaTerms.trim()) {
    html += `<div class="terms-block avoid-break">
      <h4>Master Service Terms</h4>
      ${termsToListHtml(msaTerms)}
    </div>`;
  }
  if (sowTerms.trim()) {
    html += `<div class="terms-block avoid-break">
      <h4>Project-Specific Terms</h4>
      ${termsToListHtml(sowTerms)}
    </div>`;
  }
  if (!html) {
    html = `<div class="terms-block avoid-break">
      <h4>Terms &amp; Conditions</h4>
      <p style="margin:0">Standard Nestlancer service terms apply as agreed in the accepted quotation.</p>
    </div>`;
  }
  return html;
}

export function getContractTemplate(data: Record<string, unknown>): string {
  const audience = resolveAudience(data);
  const company = (data.company as Record<string, string>) || {};
  const client = (data.client as Record<string, string>) || {};
  const isDraft = Boolean(data.isDraft);
  const contractNumber = String(data.contractNumber || 'CTR-000');
  const acceptedAt = String(data.acceptedAt || new Date().toISOString().split('T')[0]);
  const signatureName = String(data.signatureName || client.name || '');
  const msaTerms = String(data.msaTerms || data.terms || '');
  const sowTerms = String(data.sowTerms || data.termsAndConditions || '');
  const projectTitle = String(data.projectTitle || '');
  const quoteNumber = String(data.quoteNumber || '');
  const description = String(data.description || '');
  const totalPaise = Number(data.totalPaise || 0);
  const currency = String(data.currency || 'INR');
  const revisionsIncluded = Number(data.revisionsIncluded ?? 2);
  const validUntil = String(data.validUntil || '');
  const items = Array.isArray(data.items) ? (data.items as Array<Record<string, unknown>>) : [];
  const paymentSchedule = Array.isArray(data.paymentSchedule)
    ? (data.paymentSchedule as Array<Record<string, unknown>>)
    : [];

  const internalMeta: InternalMetaCell[] = Array.isArray(data.internalMeta)
    ? (data.internalMeta as InternalMetaCell[])
    : audience === 'admin'
      ? [
          data.quoteId ? { label: 'Quote ID', value: String(data.quoteId) } : null,
          data.contractDocumentId
            ? { label: 'Document ID', value: String(data.contractDocumentId) }
            : null,
        ].filter((x): x is InternalMetaCell => x != null)
      : [];

  const body = `
  ${isDraft ? '<p class="draft-banner">DRAFT — For review only. Not binding until you accept the quote and sign electronically.</p>' : ''}
  ${buildGstParties('Service Provider', company, 'Client', client)}

  <p class="muted-note">This Service Agreement ("Agreement") is entered into between Nestlancer and the Client for the project described below. It incorporates the accepted quotation${quoteNumber ? ` <strong>${escapeHtml(quoteNumber)}</strong>` : ''} and governs delivery, payment, and use of deliverables.</p>

  ${projectTitle ? `<p class="section-title">Project</p><p class="muted-note"><strong>${escapeHtml(projectTitle)}</strong>${description ? ` — ${escapeHtml(description)}` : ''}</p>` : ''}

  <div class="invoice-meta-row cols-3 avoid-break">
    <div class="cell"><span class="label">Contract Value</span><span class="value">${escapeHtml(formatMoney(totalPaise, currency))}</span></div>
    ${quoteNumber ? `<div class="cell"><span class="label">Quote Reference</span><span class="value">${escapeHtml(quoteNumber)}</span></div>` : ''}
    ${validUntil ? `<div class="cell"><span class="label">Quote Valid Until</span><span class="value">${escapeHtml(formatDisplayDate(validUntil))}</span></div>` : ''}
  </div>

  <div class="amount-words">Amount in words: ${escapeHtml(amountInWords(totalPaise, currency))}</div>

  ${buildScopeTable(items, currency)}
  ${buildPaymentScheduleTable(paymentSchedule, currency)}

  <p class="muted-note" style="margin-top:8px">Revision rounds included: <strong>${revisionsIncluded}</strong>. Additional scope requires a written change order.</p>

  ${buildTermsSection(msaTerms, sowTerms)}

  <div class="signature-block avoid-break">
    <h3>${isDraft ? 'Signature (upon acceptance)' : 'Client Acceptance'}</h3>
    ${
      isDraft
        ? '<p>By accepting the quote in your Nestlancer dashboard you agree to this Agreement and authorize electronic signature.</p>'
        : '<p>Accepted electronically via the Nestlancer platform.</p>'
    }
  ${
    !isDraft && signatureName
      ? `<p style="margin-top:12px"><strong>Signed by:</strong> ${escapeHtml(signatureName)}</p>
         <p><strong>Date:</strong> ${escapeHtml(formatDisplayDate(acceptedAt))}</p>`
      : isDraft
        ? '<p style="margin-top:12px;color:var(--muted)">Signature pending quote acceptance.</p>'
        : ''
  }
    <p style="font-size:10px;color:var(--muted);margin-top:8px">By signing, the Client agrees to all terms in this Agreement.</p>
  </div>`;

  const layout: DocumentLayoutOptions = {
    audience,
    company,
    client,
    projectTitle,
    projectBannerLabel: 'Service Agreement',
    documentClass: 'doc-contract',
    internalMeta: internalMeta.length ? internalMeta : undefined,
    meta: {
      documentType: 'Agreement',
      documentNumber: contractNumber,
      date: acceptedAt,
      extraLines: isDraft
        ? ['Draft preview — not signed']
        : [`Accepted: ${formatDisplayDate(acceptedAt)}`],
      verificationUrl: publicDocumentVerifyUrl(contractNumber),
      notes:
        audience === 'admin'
          ? 'Immutable legal record · Admin copy'
          : 'Immutable legal record · Computer-generated',
    },
  };

  return wrapDocumentHtml(body, layout);
}
