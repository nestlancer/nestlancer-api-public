import { BRAND_COLORS } from '../utils/brand.util';

export function getBaseStyles(): string {
  const c = BRAND_COLORS;
  return `<style>
    @page { size: A4 portrait; margin: 16mm 14mm 20mm 14mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      color: ${c.text};
      margin: 0;
      padding: 0;
      font-size: 11px;
      line-height: 1.5;
      position: relative;
    }
    .page-content { position: relative; z-index: 1; }
    .avoid-break { page-break-inside: avoid; }

    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 280px;
      height: 280px;
      opacity: 0.08;
      z-index: 0;
      pointer-events: none;
    }
    .watermark img { width: 100%; height: 100%; object-fit: contain; }

    .run-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 10px;
      margin-bottom: 14px;
      border-bottom: 2px solid ${c.navy};
    }
    .run-header .brand img { height: 32px; width: auto; display: block; }
    .run-header .brand .legal {
      margin: 6px 0 0;
      font-size: 9px;
      color: ${c.muted};
      font-weight: 600;
      letter-spacing: 0.2px;
    }
    .run-header .meta { text-align: right; min-width: 180px; }
    .run-header .meta .doctype {
      margin: 0;
      font-size: 18px;
      font-weight: 800;
      color: ${c.navy};
      text-transform: uppercase;
      letter-spacing: 0.8px;
      line-height: 1.15;
    }
    .run-header .meta .docno {
      margin: 5px 0 0;
      font-size: 12px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .run-header .meta .docdate { margin: 3px 0 0; font-size: 10px; color: ${c.muted}; }

    .run-header--compact {
      padding-bottom: 8px;
      margin-bottom: 12px;
      border-bottom-width: 1px;
    }
    .run-header--compact .brand img { height: 28px; }
    .run-header--compact .meta .doctype { font-size: 14px; }

    .audience-client .run-footer {
      border-top: 1px solid ${c.border};
      padding-top: 10px;
      margin-top: 16px;
      text-align: center;
      font-size: 9px;
      color: ${c.muted};
      line-height: 1.65;
      page-break-inside: avoid;
      page-break-before: avoid;
      break-before: avoid;
    }
    .audience-client .run-footer .company-line { font-weight: 600; color: ${c.text}; }
    .audience-client .run-footer .verify { color: ${c.teal}; font-weight: 600; }

    .audience-admin .admin-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #1e293b;
      color: #f8fafc;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      padding: 5px 10px;
      margin-bottom: 12px;
      border-radius: 4px;
    }
    .audience-admin .admin-banner .badge {
      background: #dc2626;
      color: #fff;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 8px;
    }
    .audience-admin .internal-meta {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      background: ${c.surface};
      border: 1px solid ${c.border};
      border-radius: 4px;
      padding: 8px 10px;
      margin-bottom: 16px;
      font-size: 9px;
    }
    .audience-admin .internal-meta .cell .label {
      display: block;
      color: ${c.muted};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
      margin-bottom: 2px;
    }
    .audience-admin .internal-meta .cell .value {
      font-weight: 600;
      color: ${c.text};
      font-variant-numeric: tabular-nums;
      word-break: break-all;
    }
    .audience-admin .run-header { border-bottom-color: #94a3b8; }
    .audience-admin .run-footer {
      border-top: 1px solid #cbd5e1;
      padding-top: 8px;
      margin-top: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 8px;
      color: ${c.muted};
      line-height: 1.5;
    }
    .audience-admin .run-footer .confidential {
      color: #dc2626;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .audience-admin .admin-panel {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 4px;
      padding: 10px 12px;
      margin: 14px 0;
      font-size: 10px;
    }
    .audience-admin .admin-panel h4 {
      margin: 0 0 8px;
      font-size: 10px;
      color: #92400e;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .project-banner {
      background: linear-gradient(135deg, ${c.navy} 0%, #3d42a8 100%);
      color: #fff;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 16px;
    }
    .project-banner .label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      opacity: 0.75;
      margin: 0 0 4px;
    }
    .project-banner .title { font-size: 16px; font-weight: 700; margin: 0; line-height: 1.3; }

    .gst-parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }
    .gst-box { border: 1px solid ${c.border}; border-radius: 4px; overflow: hidden; }
    .gst-box .gst-box-head {
      background: ${c.navy};
      color: #fff;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      padding: 6px 10px;
    }
    .gst-box .gst-box-body { padding: 10px; font-size: 10px; line-height: 1.55; }
    .gst-box .gst-box-body .name { font-weight: 700; font-size: 11px; margin-bottom: 4px; }
    .gst-box .gst-box-body .gstin { margin-top: 6px; font-weight: 600; }

    .tax-invoice-title {
      text-align: center;
      margin: 0 0 16px;
      padding: 8px 0;
      border: 2px solid ${c.navy};
      border-radius: 4px;
    }
    .tax-invoice-title h1 {
      margin: 0;
      font-size: 16px;
      font-weight: 800;
      color: ${c.navy};
      letter-spacing: 2px;
    }
    .tax-invoice-title p { margin: 4px 0 0; font-size: 9px; color: ${c.muted}; }

    .invoice-meta-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0;
      border: 1px solid ${c.border};
      border-radius: 4px;
      margin-bottom: 16px;
      overflow: hidden;
    }
    .invoice-meta-row.cols-3 { grid-template-columns: repeat(3, 1fr); }
    .invoice-meta-row .cell {
      padding: 8px 10px;
      border-right: 1px solid ${c.border};
      font-size: 10px;
    }
    .invoice-meta-row .cell:last-child { border-right: none; }
    .invoice-meta-row .cell .label {
      display: block;
      font-size: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: ${c.muted};
      font-weight: 600;
      margin-bottom: 3px;
    }
    .invoice-meta-row .cell .value { font-weight: 700; }

    .section-title {
      font-size: 11px;
      font-weight: 700;
      color: ${c.navy};
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin: 16px 0 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid ${c.teal};
    }

    table.data-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin-bottom: 16px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid ${c.border};
    }
    table.data-table th {
      background: ${c.navy};
      color: #fff;
      padding: 10px 12px;
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      font-weight: 600;
    }
    table.data-table td {
      padding: 10px 12px;
      border-bottom: 1px solid ${c.border};
      font-size: 11px;
      vertical-align: top;
    }
    table.data-table tbody tr:last-child td { border-bottom: none; }
    table.data-table tbody tr:nth-child(even) { background: ${c.surface}; }
    table.data-table .amount { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    table.data-table .qty { text-align: center; }

    .totals-panel { display: flex; justify-content: flex-end; margin-bottom: 16px; }
    .totals-box {
      min-width: 260px;
      background: ${c.surface};
      border: 1px solid ${c.border};
      border-radius: 8px;
      padding: 14px 16px;
    }
    .totals-box .row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      font-size: 12px;
      color: ${c.muted};
    }
    .totals-box .row .value { color: ${c.text}; font-weight: 600; font-variant-numeric: tabular-nums; }
    .totals-box .total-row {
      margin-top: 8px;
      padding-top: 10px;
      border-top: 2px solid ${c.teal};
      font-size: 15px;
      font-weight: 800;
      color: ${c.navy};
    }
    .totals-box .total-row .value { color: ${c.navy}; font-size: 16px; }

    .amount-words {
      margin: 12px 0;
      padding: 8px 12px;
      background: ${c.surface};
      border-left: 3px solid ${c.teal};
      font-size: 10px;
      font-style: italic;
    }

    .callout {
      background: #e6faf7;
      border: 1px solid #99f6e4;
      border-left: 4px solid ${c.teal};
      padding: 14px 16px;
      border-radius: 8px;
      margin: 14px 0;
      font-size: 11px;
    }
    .callout strong { color: ${c.navy}; }

    .alert-box {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-left: 4px solid #dc2626;
      border-radius: 8px;
      padding: 18px 20px;
      margin: 16px 0;
    }
    .alert-amount {
      font-size: 28px;
      font-weight: 800;
      color: #dc2626;
      margin: 8px 0;
      font-variant-numeric: tabular-nums;
    }

    .success-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #dcfce7;
      color: #166534;
      padding: 8px 16px;
      border-radius: 24px;
      font-weight: 700;
      font-size: 12px;
    }
    .success-badge::before {
      content: '✓';
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      background: #166534;
      color: #fff;
      border-radius: 50%;
      font-size: 11px;
    }

    .receipt-hero { text-align: center; margin-bottom: 24px; }
    .receipt-amount {
      font-size: 32px;
      font-weight: 800;
      color: ${c.navy};
      margin: 12px 0 4px;
      font-variant-numeric: tabular-nums;
    }
    .receipt-amount-label {
      font-size: 11px;
      color: ${c.muted};
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .receipt-phase-label {
      margin: 8px 0 0;
      font-size: 12px;
      font-weight: 600;
      color: ${c.navy};
    }

    .engagement-panel,
    .schedule-section,
    .transaction-panel {
      margin: 0 0 18px;
      border: 1px solid ${c.border};
      border-radius: 8px;
      overflow: hidden;
      background: #fff;
    }
    .engagement-panel h3,
    .schedule-section h3,
    .transaction-panel h3 {
      margin: 0;
      padding: 10px 14px;
      background: ${c.surface};
      border-bottom: 1px solid ${c.border};
      font-size: 11px;
      font-weight: 700;
      color: ${c.navy};
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }
    .schedule-note {
      margin: 0;
      padding: 8px 14px 0;
      font-size: 9px;
      color: ${c.muted};
      line-height: 1.5;
    }
    .engagement-grid,
    .transaction-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0;
    }
    .engagement-cell,
    .transaction-cell {
      padding: 10px 14px;
      border-bottom: 1px solid ${c.border};
      border-right: 1px solid ${c.border};
      font-size: 10px;
    }
    .engagement-cell:nth-child(2n),
    .transaction-cell:nth-child(2n) { border-right: none; }
    .engagement-cell .label,
    .transaction-cell .label {
      display: block;
      font-size: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: ${c.muted};
      margin-bottom: 3px;
    }
    .engagement-cell .value,
    .transaction-cell .value {
      display: block;
      font-weight: 600;
      color: ${c.text};
      line-height: 1.4;
      word-break: break-word;
    }
    .ref-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 9.5px;
      letter-spacing: 0.01em;
      word-break: break-all;
    }
    .doc-ref {
      font-size: 9.5px;
      font-weight: 600;
      color: ${c.text};
      word-break: keep-all;
      overflow-wrap: normal;
      white-space: nowrap;
    }
    .schedule-table,
    .history-table {
      margin: 10px 14px 14px;
      width: calc(100% - 28px);
      table-layout: fixed;
    }
    .history-table .history-date { white-space: nowrap; }
    .history-inline {
      margin: 16px 0 12px;
    }
    .history-inline h3 {
      margin: 0 0 8px;
      padding: 0;
      background: none;
      border: none;
      font-size: 11px;
      font-weight: 700;
      color: ${c.navy};
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }
    .history-inline .history-table {
      margin: 0;
      width: 100%;
    }
    .schedule-status {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .schedule-status.status-paid { background: #dcfce7; color: #166534; }
    .schedule-status.status-current { background: #dbeafe; color: #1d4ed8; }
    .schedule-status.status-due { background: #fef3c7; color: #92400e; }
    .schedule-status.status-pending { background: #f3f4f6; color: #4b5563; }
    tr.schedule-row-current td { background: #eff6ff !important; font-weight: 600; }

    .detail-panel {
      max-width: 540px;
      margin: 0 auto;
      border: 1px solid ${c.border};
      border-radius: 8px;
      overflow: hidden;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      border-bottom: 1px solid ${c.border};
      background: #fff;
    }
    .detail-row:nth-child(even) { background: ${c.surface}; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: ${c.muted}; font-size: 11px; }
    .detail-value { font-weight: 600; font-size: 11px; text-align: right; color: ${c.text}; }
    .detail-row.amount-row { background: ${c.navy} !important; }
    .detail-row.amount-row .detail-label,
    .detail-row.amount-row .detail-value { color: #fff; font-size: 14px; font-weight: 700; }

    .terms-block {
      margin: 16px 0;
      padding: 16px;
      background: ${c.surface};
      border: 1px solid ${c.border};
      border-radius: 8px;
      font-size: 11px;
      line-height: 1.7;
    }
    .terms-block h3, .terms-block h4 {
      margin: 0 0 10px;
      color: ${c.navy};
      font-size: 13px;
      font-weight: 700;
    }
    .terms-block ol { margin: 0; padding-left: 18px; }
    .terms-block li { margin-bottom: 6px; }

    .signature-block {
      margin-top: 24px;
      padding: 16px;
      border: 2px solid ${c.navy};
      border-radius: 8px;
      page-break-inside: avoid;
    }
    .signature-block h3 { margin: 0 0 12px; color: ${c.navy}; font-size: 13px; }

    .signatory { margin-top: 20px; display: flex; justify-content: flex-end; page-break-inside: avoid; }
    .signatory .sign-box { width: 200px; text-align: center; font-size: 10px; }
    .signatory .sign-line {
      border-top: 1px solid ${c.text};
      margin-top: 36px;
      padding-top: 6px;
      font-weight: 600;
    }
    .signatory .sign-sub { font-size: 9px; color: ${c.muted}; margin-top: 2px; }

    .payment-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 16px;
    }
    .info-card {
      background: ${c.surface};
      border: 1px solid ${c.border};
      border-radius: 8px;
      padding: 12px 14px;
    }
    .info-card h4 {
      margin: 0 0 6px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: ${c.teal};
    }
    .info-card p { margin: 3px 0; font-size: 11px; }

    .muted-note { margin: 0 0 12px; font-size: 10px; color: ${c.muted}; }
    .page-break { page-break-before: always; }

    .document-closing {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .footer-note {
      margin: 12px 0 0;
      font-size: 10px;
      text-align: center;
      color: ${c.muted};
    }

    .doc-invoice .tax-invoice-title { margin-bottom: 12px; padding: 6px 0; }
    .doc-invoice .gst-parties { margin-bottom: 12px; }
    .doc-invoice .invoice-meta-row { margin-bottom: 12px; }
    .doc-invoice .invoice-project-line { margin: 0 0 8px; font-size: 10px; }
    .doc-invoice table.data-table--compact { margin-bottom: 12px; }
    .doc-invoice table.data-table--compact th,
    .doc-invoice table.data-table--compact td { padding: 7px 10px; font-size: 10px; }
    .doc-invoice .totals-panel { margin-bottom: 10px; }
    .doc-invoice .amount-words { margin: 8px 0 10px; padding: 6px 10px; }
    .doc-invoice .payment-info { margin-top: 10px; gap: 10px; }
    .doc-invoice .signatory { margin-top: 14px; }
    .doc-invoice .run-footer { margin-top: 14px; padding-top: 8px; }

    /* Client quote — compact single-page layout */
    .doc-quote .run-header { margin-bottom: 10px; padding-bottom: 8px; }
    .doc-quote .quote-project-line {
      margin: 0 0 10px;
      padding: 6px 10px;
      background: ${c.surface};
      border: 1px solid ${c.border};
      border-radius: 4px;
      font-size: 10px;
      line-height: 1.4;
    }
    .doc-quote .quote-project-line .label {
      color: ${c.muted};
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-right: 6px;
    }
    .doc-quote .gst-parties { margin-bottom: 10px; gap: 8px; }
    .doc-quote .gst-box .gst-box-head { padding: 4px 8px; font-size: 8px; }
    .doc-quote .gst-box .gst-box-body { padding: 8px; font-size: 9px; line-height: 1.45; }
    .doc-quote .gst-box .gst-box-body .name { font-size: 10px; margin-bottom: 2px; }
    .doc-quote .muted-note { margin-bottom: 8px; font-size: 9px; line-height: 1.45; }
    .doc-quote .quote-description { margin: 0 0 10px; }
    .doc-quote table.data-table { margin-bottom: 10px; }
    .doc-quote table.data-table--compact th,
    .doc-quote table.data-table--compact td { padding: 6px 8px; font-size: 9px; }
    .doc-quote table.data-table--compact th { font-size: 8px; letter-spacing: 0.5px; }
    .doc-quote .totals-panel { margin-bottom: 8px; }
    .doc-quote .totals-box { min-width: 220px; padding: 10px 12px; }
    .doc-quote .totals-box .row { padding: 3px 0; font-size: 10px; }
    .doc-quote .totals-box .total-row { font-size: 13px; margin-top: 6px; padding-top: 8px; }
    .doc-quote .totals-box .total-row .value { font-size: 14px; }
    .doc-quote .amount-words { margin: 6px 0 10px; padding: 5px 10px; font-size: 9px; }
    .doc-quote .section-title { margin: 8px 0 5px; padding-bottom: 4px; font-size: 9px; }
    .doc-quote .terms-block { margin: 8px 0; padding: 10px 12px; font-size: 9px; line-height: 1.5; }
    .doc-quote .terms-block h4 { margin: 0 0 6px; font-size: 10px; }
    .doc-quote .callout { margin: 8px 0 0; padding: 8px 10px; font-size: 9px; line-height: 1.45; }
    .doc-quote .run-footer { margin-top: 10px; padding-top: 6px; font-size: 8px; line-height: 1.5; }
    .doc-quote .document-closing { page-break-inside: avoid; break-inside: avoid; }
    .draft-banner {
      margin: 0 0 12px;
      padding: 8px 12px;
      border: 1px dashed var(--accent);
      background: #fff8e6;
      color: #7a5c00;
      font-size: 10px;
      font-weight: 600;
      text-align: center;
    }
    .doc-contract .terms-block { margin: 8px 0; padding: 10px 12px; font-size: 9px; line-height: 1.5; }
    .doc-contract .terms-block h4 { margin: 0 0 6px; font-size: 10px; }
  </style>`;
}
