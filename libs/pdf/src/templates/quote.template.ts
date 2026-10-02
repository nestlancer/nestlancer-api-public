import {
  buildGstParties,
  buildTotalsPanel,
  resolveAudience,
  wrapDocumentHtml,
} from '../layout/document-layout';
import {
  amountInWords,
  escapeHtml,
  formatDisplayDate,
  formatMoney,
  formatMoneyCell,
  termsToListHtml,
} from '../utils/format.util';
import { publicDocumentVerifyUrl } from '../utils/verify-url.util';
import {
  DocumentLayoutOptions,
  DocumentAudience,
  InternalMetaCell,
} from '../interfaces/document-branding.interface';

const DEFAULT_SAC = '998314';

function formatPaymentDueTrigger(trigger: unknown): string {
  const key = String(trigger ?? '').toLowerCase();
  switch (key) {
    case 'on_accept':
      return 'On quote acceptance';
    case 'on_prior_approved':
      return 'After prior milestone approval';
    case 'on_milestone_complete':
      return 'On milestone completion';
    default:
      return key ? key.replace(/_/g, ' ') : '—';
  }
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
        <td>${escapeHtml(String(entry.label || entry.type || 'Installment'))}</td>
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
          <th class="amount" style="width:14%">Amount (₹)</th>
          <th style="width:24%">Due</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function buildTermsBlock(title: string, body: string): string {
  if (!body.trim()) return '';
  return `<div class="terms-block">
    <h4>${escapeHtml(title)}</h4>
    ${termsToListHtml(body)}
  </div>`;
}

function buildQuoteTermsSection(data: Record<string, unknown>): string {
  const standardTerms = String(data.terms || '');
  const additionalTerms = String(data.termsAndConditions || '');

  if (standardTerms && additionalTerms) {
    return `${buildTermsBlock('Standard Terms', standardTerms)}
    ${buildTermsBlock('Project-Specific Terms', additionalTerms)}`;
  }

  if (standardTerms) {
    return buildTermsBlock('Terms & Conditions', standardTerms);
  }

  if (additionalTerms) {
    return buildTermsBlock('Terms & Conditions', additionalTerms);
  }

  return '';
}

function buildAdminQuoteExtras(data: Record<string, unknown>, audience: DocumentAudience): string {
  const scope = data.scope;
  const timeline = data.timeline;
  const internalNotes = data.internalNotes ? String(data.internalNotes) : '';

  let html = '';

  if (data.description) {
    html +=
      audience === 'admin'
        ? `<p class="section-title">Description</p>
      <p class="muted-note">${escapeHtml(String(data.description))}</p>`
        : `<p class="quote-description muted-note">${escapeHtml(String(data.description))}</p>`;
  }

  if (Array.isArray(scope) && scope.length > 0) {
    html += `<p class="section-title">Scope</p>
      <ul style="margin:0 0 14px;padding-left:18px;font-size:10px">${scope
        .map((item) => `<li>${escapeHtml(String(item))}</li>`)
        .join('')}</ul>`;
  }

  if (Array.isArray(timeline) && timeline.length > 0) {
    html += `<p class="section-title">Timeline</p>
      <table class="data-table avoid-break">
        <thead><tr><th>Phase</th><th>Weeks</th><th>Deliverable</th></tr></thead>
        <tbody>${timeline
          .map((entry) => {
            const row = entry as Record<string, unknown>;
            return `<tr>
              <td>${escapeHtml(row.phase ?? row.name ?? '')}</td>
              <td>${escapeHtml(row.weeks ?? row.duration ?? '')}</td>
              <td>${escapeHtml(row.deliverable ?? row.description ?? '')}</td>
            </tr>`;
          })
          .join('')}</tbody>
      </table>`;
  }

  if (internalNotes) {
    html += `<div class="admin-panel avoid-break">
      <h4>Internal Notes</h4>
      <p style="margin:0">${escapeHtml(internalNotes)}</p>
    </div>`;
  }

  return html;
}

export function getQuoteTemplate(data: Record<string, unknown>): string {
  const audience = resolveAudience(data);
  const company = (data.company as Record<string, string>) || {};
  const client = (data.client as Record<string, string>) || {};
  const items = (data.items as Array<Record<string, unknown>>) || [];
  const quoteNumber = String(data.quoteNumber || 'QTE-000');
  const quoteDate = String(data.quoteDate || new Date().toISOString().split('T')[0]);
  const expiryDate = String(data.expiryDate || '');
  const totalPaise = Number(data.totalPaise || 0);
  const subtotalPaise = Number(data.subtotalPaise || 0);
  const taxPaise = Number(data.taxPaise || 0);
  const explicitTaxPct = Number(data.taxPercentage ?? data.taxRate);
  const taxPct =
    subtotalPaise > 0
      ? Math.round((taxPaise / subtotalPaise) * 100)
      : Number.isFinite(explicitTaxPct) && explicitTaxPct >= 0
        ? explicitTaxPct
        : 0;
  const currency = String(data.currency || 'INR');
  const projectTitle = String(data.projectTitle || '');
  const paymentSchedule = Array.isArray(data.paymentSchedule)
    ? (data.paymentSchedule as Array<Record<string, unknown>>)
    : [];

  const itemRows = items
    .map(
      (item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(item.description || item.detail || '')}${item.detail && item.description ? ` — ${escapeHtml(item.detail)}` : ''}</td>
      ${audience === 'admin' ? `<td>${escapeHtml(item.sac || DEFAULT_SAC)}</td>` : ''}
      <td class="qty">${escapeHtml(item.quantity ?? 1)}</td>
      <td class="amount">${formatMoneyCell(Number(item.unitPricePaise || 0), currency)}</td>
      <td class="amount">${formatMoneyCell(Number(item.totalPaise || 0), currency)}</td>
    </tr>`,
    )
    .join('');

  const internalMeta: InternalMetaCell[] = Array.isArray(data.internalMeta)
    ? (data.internalMeta as InternalMetaCell[])
    : audience === 'admin'
      ? [
          data.quoteId ? { label: 'Quote ID', value: String(data.quoteId) } : null,
          data.requestId ? { label: 'Request ID', value: String(data.requestId) } : null,
          data.projectId ? { label: 'Project ID', value: String(data.projectId) } : null,
          data.clientId ? { label: 'Client ID', value: String(data.clientId) } : null,
          expiryDate ? { label: 'Valid Until', value: formatDisplayDate(expiryDate) } : null,
        ].filter((x): x is InternalMetaCell => x != null)
      : [];

  const body = `
  ${buildGstParties('Prepared By', company, 'Prepared For', client)}

  <div class="invoice-meta-row avoid-break">
    <div class="cell"><span class="label">Issue date</span><span class="value">${escapeHtml(formatDisplayDate(quoteDate))}</span></div>
    ${
      expiryDate
        ? `<div class="cell"><span class="label">Valid until</span><span class="value">${escapeHtml(formatDisplayDate(expiryDate))}</span></div>`
        : ''
    }
  </div>

  <p class="muted-note">Thank you for your enquiry. Please find below our proposal${projectTitle ? ` for <strong>${escapeHtml(projectTitle)}</strong>` : ''}. All amounts are in Indian Rupees (INR).</p>

  <table class="data-table data-table--compact avoid-break">
    <thead>
      <tr>
        <th style="width:4%">#</th>
        <th>Description of Services</th>
        ${audience === 'admin' ? '<th style="width:9%">SAC</th>' : ''}
        <th class="qty" style="width:8%">Qty</th>
        <th class="amount" style="width:14%">Rate (₹)</th>
        <th class="amount" style="width:14%">Amount (₹)</th>
      </tr>
    </thead>
    <tbody>${itemRows || '<tr><td colspan="6">No line items</td></tr>'}</tbody>
  </table>

  ${buildTotalsPanel([
    {
      label: audience === 'admin' ? `Subtotal (paise: ${subtotalPaise})` : 'Subtotal',
      value: formatMoney(subtotalPaise, currency),
    },
    {
      label: audience === 'admin' ? `Tax ${taxPct}% (paise: ${taxPaise})` : `GST (${taxPct}%)`,
      value: formatMoney(taxPaise, currency),
    },
    {
      label: audience === 'admin' ? `Total (paise: ${totalPaise})` : 'Total Quote Value',
      value: formatMoney(totalPaise, currency),
      isTotal: true,
    },
  ])}

  <div class="amount-words">Amount in words: ${escapeHtml(amountInWords(totalPaise, currency))}</div>

  ${buildAdminQuoteExtras(data, audience)}

  <div class="document-closing avoid-break">
  ${buildPaymentScheduleTable(paymentSchedule, currency)}

  ${buildQuoteTermsSection(data)}

  ${
    audience === 'client'
      ? `<div class="callout">
          <p><strong>Next step:</strong> Review and accept this quote in your Nestlancer dashboard to generate your service agreement.</p>
        </div>`
      : ''
  }
  </div>`;

  const layout: DocumentLayoutOptions = {
    audience,
    company,
    client,
    projectTitle,
    compactHeader: audience === 'client',
    compactProject: audience === 'client',
    documentClass: 'doc-quote',
    internalMeta: internalMeta.length ? internalMeta : undefined,
    meta: {
      documentType: 'Quotation',
      documentNumber: quoteNumber,
      date: quoteDate,
      extraLines: expiryDate ? [`Valid until: ${formatDisplayDate(expiryDate)}`] : [],
      verificationUrl: publicDocumentVerifyUrl(quoteNumber),
      notes: 'Computer-generated document.',
      status: data.status ? String(data.status) : undefined,
      triggerEvent: data.triggerEvent ? String(data.triggerEvent) : undefined,
    },
  };

  return wrapDocumentHtml(body, layout);
}
