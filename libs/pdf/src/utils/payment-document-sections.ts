import type {
  PaymentDocumentContext,
  PaymentScheduleRow,
  PaymentTransactionRow,
} from '../interfaces/payment-document.interface';
import { escapeHtml, formatDisplayDate, formatMoney, formatMoneyCell, formatPaymentMethodLabel, formatPaymentStatusLabel } from './format.util';

function statusClass(status: PaymentScheduleRow['status']): string {
  switch (status) {
    case 'paid':
      return 'status-paid';
    case 'current':
      return 'status-current';
    case 'due':
      return 'status-due';
    default:
      return 'status-pending';
  }
}

function formatScheduleReference(row: PaymentScheduleRow): string {
  // Never put bank UTR / payment refs in the document-number column (NL-BUG-PAY-008).
  if (row.receiptNumber) return row.receiptNumber;
  if (row.invoiceNumber) return row.invoiceNumber;
  return '—';
}

function formatDocRef(value?: string): string {
  return value?.trim() ? escapeHtml(value.trim()) : '—';
}

function formatPaymentRef(row: PaymentTransactionRow): string {
  const ref = row.transactionRef?.trim();
  if (!ref || ref === '—') return '—';
  if (ref === row.receiptNumber?.trim() || ref === row.invoiceNumber?.trim()) return '—';
  return formatDocRef(ref);
}

export function buildEngagementSummaryPanel(
  engagement: PaymentDocumentContext['engagement'],
  currency: string,
): string {
  const cells = [
    { label: 'Project', value: engagement.projectTitle },
    engagement.contractReference
      ? { label: 'Contract / quote no.', value: engagement.contractReference }
      : null,
    engagement.quoteNumber && engagement.quoteNumber !== engagement.contractReference
      ? { label: 'Quote no.', value: engagement.quoteNumber }
      : null,
    { label: 'Project ID', value: engagement.projectId, mono: true },
    engagement.currentPhaseLabel
      ? { label: 'Payment phase', value: engagement.currentPhaseLabel }
      : null,
    engagement.paymentSequenceLabel
      ? { label: 'Installment', value: engagement.paymentSequenceLabel }
      : null,
    {
      label: 'Contract value',
      value: formatMoney(engagement.contractValuePaise, currency),
    },
    {
      label: 'Paid to date',
      value: `${formatMoney(engagement.totalPaidPaise, currency)} (${engagement.completedPaymentsCount}/${engagement.schedulePaymentsCount || engagement.completedPaymentsCount})`,
    },
    {
      label: 'Balance remaining',
      value: formatMoney(engagement.totalPendingPaise, currency),
    },
  ].filter((cell): cell is { label: string; value: string; mono?: boolean } => cell != null);

  return `<div class="engagement-panel avoid-break">
    <h3>Project &amp; payment engagement</h3>
    <div class="engagement-grid">
      ${cells
        .map(
          (cell) => `<div class="engagement-cell">
        <span class="label">${escapeHtml(cell.label)}</span>
        <span class="value${cell.mono ? ' ref-mono' : ''}">${escapeHtml(cell.value)}</span>
      </div>`,
        )
        .join('')}
    </div>
  </div>`;
}

export function buildPaymentScheduleTable(
  rows: PaymentScheduleRow[],
  currency: string,
  options?: { highlightCurrent?: boolean },
): string {
  if (rows.length === 0) return '';

  const body = rows
    .map((row) => {
      const rowClass = [
        options?.highlightCurrent !== false && row.isCurrent ? 'schedule-row-current' : '',
        statusClass(row.status),
      ]
        .filter(Boolean)
        .join(' ');
      return `<tr class="${rowClass}">
        <td>${row.sequence}</td>
        <td>${escapeHtml(row.name)}</td>
        <td class="amount">${formatMoneyCell(row.amountPaise, currency)}</td>
        <td><span class="schedule-status ${statusClass(row.status)}">${escapeHtml(row.statusLabel)}</span></td>
        <td class="doc-ref">${escapeHtml(formatScheduleReference(row))}</td>
        <td>${row.paidAt ? escapeHtml(formatDisplayDate(row.paidAt)) : '—'}</td>
      </tr>`;
    })
    .join('');

  return `<div class="schedule-section avoid-break">
    <h3>Project payment schedule</h3>
    <p class="schedule-note">Official receipt or invoice numbers are shown for completed installments. Pending rows show the invoice reference where issued.</p>
    <table class="data-table data-table--compact schedule-table">
      <thead>
        <tr>
          <th style="width:6%">#</th>
          <th>Milestone / phase</th>
          <th class="amount" style="width:14%">Amount</th>
          <th style="width:12%">Status</th>
          <th style="width:22%">Receipt / invoice no.</th>
          <th style="width:14%">Paid on</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  </div>`;
}

export function buildTransactionHistoryTable(
  rows: PaymentTransactionRow[],
  currency: string,
  options?: { layout?: 'panel' | 'inline' },
): string {
  if (rows.length === 0) return '';

  const layout = options?.layout ?? 'panel';
  const wrapperClass =
    layout === 'inline' ? 'history-inline avoid-break' : 'schedule-section avoid-break';
  const tableClass =
    layout === 'inline'
      ? 'data-table data-table--compact history-table'
      : 'data-table data-table--compact schedule-table history-table';

  const body = rows
    .map(
      (row) => `<tr class="${row.isCurrent ? 'schedule-row-current' : ''}">
        <td>${row.sequence}</td>
        <td class="history-date">${escapeHtml(formatDisplayDate(row.date))}</td>
        <td>${escapeHtml(row.milestoneName)}</td>
        <td class="amount">${formatMoneyCell(row.amountPaise, currency)}</td>
        <td class="doc-ref">${formatDocRef(row.receiptNumber)}</td>
        <td class="doc-ref">${formatDocRef(row.invoiceNumber)}</td>
        <td class="doc-ref">${formatPaymentRef(row)}</td>
      </tr>`,
    )
    .join('');

  return `<div class="${wrapperClass}">
    <h3>Transaction history</h3>
    <table class="${tableClass}">
      <thead>
        <tr>
          <th style="width:5%">#</th>
          <th style="width:12%">Date</th>
          <th>Milestone</th>
          <th class="amount" style="width:12%">Amount (₹)</th>
          <th style="width:17%">Receipt no.</th>
          <th style="width:17%">Invoice no.</th>
          <th style="width:17%">Payment ref.</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  </div>`;
}

export function buildTransactionDetailsPanel(
  context: PaymentDocumentContext,
  currency: string,
  amountPaise: number,
  options?: { documentNumber?: string; documentType?: 'Receipt' | 'Invoice' },
): string {
  const rows = [
    options?.documentNumber
      ? {
          label: options.documentType === 'Invoice' ? 'Invoice no.' : 'Receipt no.',
          value: options.documentNumber,
        }
      : context.receiptNumber
        ? { label: 'Receipt no.', value: context.receiptNumber }
        : null,
    context.invoiceNumber ? { label: 'Invoice no.', value: context.invoiceNumber } : null,
    context.transactionRef ? { label: 'Payment reference', value: context.transactionRef } : null,
    context.transactionId && context.transactionId !== context.transactionRef
      ? { label: 'Bank / gateway ref.', value: context.transactionId }
      : null,
    context.paymentMethod
      ? { label: 'Payment method', value: formatPaymentMethodLabel(context.paymentMethod) }
      : null,
    context.paidAtDisplay
      ? { label: 'Paid on', value: formatDisplayDate(context.paidAtDisplay) }
      : null,
    context.engagement.currentPhaseLabel
      ? { label: 'Milestone phase', value: context.engagement.currentPhaseLabel }
      : null,
    context.engagement.paymentSequenceLabel
      ? { label: 'Installment', value: context.engagement.paymentSequenceLabel }
      : null,
    context.engagement.contractReference
      ? { label: 'Contract / quote no.', value: context.engagement.contractReference }
      : null,
    { label: 'Nestlancer payment ID', value: context.paymentId, mono: true },
    { label: 'Payment status', value: formatPaymentStatusLabel(context.paymentStatus) },
    { label: 'Amount', value: formatMoney(amountPaise, currency) },
  ].filter((row): row is { label: string; value: string; mono?: boolean } => row != null);

  return `<div class="transaction-panel avoid-break">
    <h3>Transaction details</h3>
    <div class="transaction-grid">
      ${rows
        .map(
          (row) => `<div class="transaction-cell">
        <span class="label">${escapeHtml(row.label)}</span>
        <span class="value${row.mono ? ' ref-mono' : ''}">${escapeHtml(row.value)}</span>
      </div>`,
        )
        .join('')}
    </div>
  </div>`;
}
