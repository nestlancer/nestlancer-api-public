import {
  buildGstParties,
  buildRunHeader,
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
} from '../utils/format.util';
import { publicDocumentVerifyUrl } from '../utils/verify-url.util';
import {
  buildEngagementSummaryPanel,
  buildPaymentScheduleTable,
  buildTransactionHistoryTable,
} from '../utils/payment-document-sections';
import type { PaymentDocumentContext } from '../interfaces/payment-document.interface';
import { DocumentLayoutOptions, InternalMetaCell } from '../interfaces/document-branding.interface';

const DEFAULT_SAC = '998314';

function formatRate(rate: number): string {
  const rounded = Math.round(rate * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

/** Half of the actual GST rate. Never invent 9% when the document has no tax or a different rate. */
function resolveInvoiceGstRate(
  data: Record<string, unknown>,
  items: Array<Record<string, unknown>>,
  taxPaise: number,
  subtotalPaise: number,
): number {
  const explicit = Number(data.taxRate);
  if (Number.isFinite(explicit) && explicit >= 0) return explicit;
  const itemRate = items.map((item) => Number(item.taxRate)).find((rate) => Number.isFinite(rate) && rate >= 0);
  if (itemRate !== undefined) return itemRate;
  if (subtotalPaise > 0) return Math.round((taxPaise / subtotalPaise) * 10000) / 100;
  return 0;
}

export function getInvoiceTemplate(data: Record<string, unknown>): string {
  const audience = resolveAudience(data);
  const company = (data.company as Record<string, string>) || {};
  const client = (data.client as Record<string, string>) || {};
  const project = (data.project as Record<string, string>) || {};
  const items = (data.items as Array<Record<string, unknown>>) || [];
  const invoiceNumber = String(data.invoiceNumber || 'INV-000');
  const invoiceDate = String(data.invoiceDate || new Date().toISOString().split('T')[0]);
  const dueDate = String(data.dueDate || '');
  const totalPaise = Number(data.totalPaise || 0);
  const subtotalPaise = Number(data.subtotalPaise || totalPaise);
  const taxPaise = Number(data.taxPaise || 0);
  const cgstPaise = Number(data.cgstPaise || Math.floor(taxPaise / 2));
  const sgstPaise = Number(data.sgstPaise || taxPaise - cgstPaise);
  const currency = String(data.currency || 'INR');
  const projectTitle = String(data.projectTitle || project.title || '');
  const paymentContext = data.paymentContext as PaymentDocumentContext | undefined;
  const placeOfSupply = String(
    data.placeOfSupply ||
      (client.state && client.stateCode
        ? `${client.state} (${client.stateCode})`
        : company.state && company.stateCode
          ? `${company.state} (${company.stateCode})`
          : 'Karnataka (29)'),
  );
  const reverseCharge = data.reverseCharge === true ? 'Yes' : 'No';
  const gstRate = resolveInvoiceGstRate(data, items, taxPaise, subtotalPaise);
  const halfRateLabel = formatRate(gstRate / 2);
  const cgstLabel = `CGST @ ${halfRateLabel}%`;
  const sgstLabel = `SGST @ ${halfRateLabel}%`;

  const itemRows = items
    .map((item, index) => {
      const taxable = Number(item.totalPaise ?? item.unitPricePaise ?? 0);
      const rate = Number(item.taxRate ?? data.taxRate ?? (taxPaise > 0 ? 18 : 0));
      const lineCgst = Number(item.cgstPaise ?? Math.floor((taxable * rate) / 100 / 2));
      const lineSgst = Number(item.sgstPaise ?? Math.floor((taxable * rate) / 100 / 2));
      const lineTotal = taxable + lineCgst + lineSgst;
      return `<tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item.description || '')}</td>
        <td>${escapeHtml(item.sac || DEFAULT_SAC)}</td>
        <td class="qty">${escapeHtml(item.quantity ?? 1)}</td>
        <td class="amount">${formatMoneyCell(taxable, currency)}</td>
        <td>${rate}%</td>
        <td class="amount">${formatMoneyCell(lineCgst, currency)}</td>
        <td class="amount">${formatMoneyCell(lineSgst, currency)}</td>
        <td class="amount">${formatMoneyCell(lineTotal, currency)}</td>
      </tr>`;
    })
    .join('');

  const internalMeta: InternalMetaCell[] = Array.isArray(data.internalMeta)
    ? (data.internalMeta as InternalMetaCell[])
    : audience === 'admin'
      ? [
          data.paymentId ? { label: 'Payment ID', value: String(data.paymentId) } : null,
          data.milestoneId ? { label: 'Milestone ID', value: String(data.milestoneId) } : null,
          data.invoiceId ? { label: 'Invoice ID', value: String(data.invoiceId) } : null,
        ].filter((x): x is InternalMetaCell => x != null)
      : [];

  const body = `
  <div class="tax-invoice-title">
    <h1>TAX INVOICE</h1>
    <p>Original for Recipient · GST Rule 46, CGST Rules 2017</p>
  </div>

  ${buildRunHeader(
    {
      audience,
      company,
      client,
      meta: { documentType: 'Invoice', documentNumber: invoiceNumber, date: invoiceDate },
    },
    'compact',
  )}

  ${buildGstParties('Supplier (Seller)', company, 'Recipient (Buyer)', client)}

  <div class="invoice-meta-row">
    <div class="cell"><span class="label">Invoice Date</span><span class="value">${escapeHtml(formatDisplayDate(invoiceDate))}</span></div>
    ${
      dueDate
        ? `<div class="cell"><span class="label">Due Date</span><span class="value">${escapeHtml(formatDisplayDate(dueDate))}</span></div>`
        : ''
    }
    <div class="cell"><span class="label">Place of Supply</span><span class="value">${escapeHtml(placeOfSupply)}</span></div>
    <div class="cell"><span class="label">Reverse Charge</span><span class="value">${reverseCharge}</span></div>
  </div>

  ${projectTitle ? `<p class="invoice-project-line"><strong>Project:</strong> ${escapeHtml(projectTitle)}</p>` : ''}

  ${
    paymentContext
      ? `${buildEngagementSummaryPanel(paymentContext.engagement, currency)}
  ${buildPaymentScheduleTable(paymentContext.paymentSchedule, currency)}`
      : ''
  }

  <table class="data-table data-table--compact">
    <thead>
      <tr>
        <th style="width:5%">#</th>
        <th>Description</th>
        <th style="width:9%">SAC</th>
        <th class="qty" style="width:7%">Qty</th>
        <th class="amount" style="width:12%">Taxable (₹)</th>
        <th style="width:7%">Rate</th>
        <th class="amount" style="width:10%">CGST</th>
        <th class="amount" style="width:10%">SGST</th>
        <th class="amount" style="width:12%">Total (₹)</th>
      </tr>
    </thead>
    <tbody>${itemRows || '<tr><td colspan="10">No line items</td></tr>'}</tbody>
  </table>

  <div class="document-closing">
  ${buildTotalsPanel(
    [
      { label: 'Taxable Value', value: formatMoney(subtotalPaise, currency) },
      { label: cgstLabel, value: formatMoney(cgstPaise, currency) },
      { label: sgstLabel, value: formatMoney(sgstPaise, currency) },
      { label: 'Total Amount Due', value: formatMoney(totalPaise, currency), isTotal: true },
    ],
    { avoidBreak: false },
  )}

  <div class="amount-words">Amount in words: ${escapeHtml(amountInWords(totalPaise, currency))}</div>

  ${paymentContext ? buildTransactionHistoryTable(paymentContext.transactionHistory, currency, { layout: 'inline' }) : ''}

  ${
    audience === 'admin' && data.providerDetails
      ? `<div class="admin-panel">
          <h4>Provider Details</h4>
          <pre style="margin:0;font-size:9px;white-space:pre-wrap">${escapeHtml(JSON.stringify(data.providerDetails, null, 2))}</pre>
        </div>`
      : ''
  }

  <div class="payment-info">
    <div class="info-card">
      <h4>Pay Online</h4>
      <p>Log in to your Nestlancer dashboard → <strong>Payments</strong> → pay invoice <strong>${escapeHtml(invoiceNumber)}</strong>.</p>
      ${company.upi ? `<p>UPI: ${escapeHtml(company.upi)}</p>` : ''}
    </div>
    <div class="info-card">
      <h4>Bank Transfer</h4>
      ${company.bankName ? `<p><strong>${escapeHtml(company.bankName)}</strong>${company.accountNumber ? ` · A/C ${escapeHtml(company.accountNumber)}` : ''}</p>` : ''}
      ${company.ifsc ? `<p>IFSC: ${escapeHtml(company.ifsc)}</p>` : ''}
      <p>Ref: ${escapeHtml(invoiceNumber)}</p>
    </div>
  </div>

  <div class="signatory">
    <div class="sign-box">
      <div class="sign-line">Authorised Signatory</div>
      <p class="sign-sub">For ${escapeHtml(company.legalName || company.name || 'Nestlancer')}</p>
    </div>
  </div>

  <p class="footer-note">This is a computer-generated tax invoice.</p>
  </div>`;

  const layout: DocumentLayoutOptions = {
    audience,
    company,
    client,
    internalMeta: internalMeta.length ? internalMeta : undefined,
    suppressRunHeader: true,
    documentClass: 'doc-invoice',
    meta: {
      documentType: 'Invoice',
      documentNumber: invoiceNumber,
      date: invoiceDate,
      extraLines: dueDate ? [] : undefined,
      verificationUrl: publicDocumentVerifyUrl(invoiceNumber),
      notes: company.email ? `For queries: ${company.email}` : undefined,
      status: data.status ? String(data.status) : undefined,
    },
  };

  return wrapDocumentHtml(body, layout);
}
