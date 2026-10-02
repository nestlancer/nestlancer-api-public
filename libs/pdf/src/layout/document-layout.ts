import {
  ClientBranding,
  CompanyBranding,
  DocumentAudience,
  DocumentLayoutOptions,
  InternalMetaCell,
} from '../interfaces/document-branding.interface';
import { getLogoFullDataUri, getLogoIconDataUri, BRAND_COLORS } from '../utils/brand.util';
import { escapeHtml, formatDisplayDate, splitAddressLines } from '../utils/format.util';
import { publicDocumentVerifyUrl } from '../utils/verify-url.util';
import { getBaseStyles } from '../styles/base-styles';

export function resolveAudience(data: Record<string, unknown>): DocumentAudience {
  return data.audience === 'admin' ? 'admin' : 'client';
}

export function buildWatermark(): string {
  const iconUri = getLogoIconDataUri();
  return `<div class="watermark"><img src="${iconUri}" alt="" /></div>`;
}

function renderAddressHtml(address?: string): string {
  const lines = splitAddressLines(address);
  if (lines.length === 0) return '';
  return lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('');
}

export function buildAdminBanner(options: DocumentLayoutOptions): string {
  const generated = options.meta.generatedAt
    ? formatDisplayDate(options.meta.generatedAt)
    : formatDisplayDate(new Date().toISOString());
  return `<div class="admin-banner avoid-break">
    <span><span class="badge">Internal</span> &nbsp; Admin Document Copy</span>
    <span>Generated: ${escapeHtml(generated)}</span>
  </div>`;
}

export function buildInternalMeta(cells: InternalMetaCell[]): string {
  if (cells.length === 0) return '';
  return `<div class="internal-meta avoid-break">${cells
    .map(
      (cell) =>
        `<div class="cell"><span class="label">${escapeHtml(cell.label)}</span><span class="value">${escapeHtml(cell.value)}</span></div>`,
    )
    .join('')}</div>`;
}

export function buildRunHeader(
  options: DocumentLayoutOptions,
  variant: 'full' | 'compact' = 'full',
): string {
  const { company, meta } = options;
  const logoUri = getLogoFullDataUri();
  const legalName = company.legalName || company.name || 'Nestlancer';
  const audience = options.audience || 'client';
  const compact = variant === 'compact';
  const dateParts: string[] = [];
  if (meta.date) dateParts.push(`Date: ${formatDisplayDate(meta.date)}`);
  if (meta.extraLines?.length) dateParts.push(...meta.extraLines);
  if (audience === 'admin' && meta.status) dateParts.push(`Status: ${meta.status}`);
  const docdateLine =
    !compact && dateParts.length
      ? `<p class="docdate">${dateParts.map((p) => escapeHtml(p)).join(' &nbsp;·&nbsp; ')}</p>`
      : '';

  return `<header class="run-header${compact ? ' run-header--compact' : ''}">
    <div class="brand">
      <img src="${logoUri}" alt="${escapeHtml(company.name || 'Nestlancer')}" />
      ${compact ? '' : `<p class="legal">${escapeHtml(audience === 'admin' ? `${legalName} — Admin Export` : legalName)}</p>`}
    </div>
    <div class="meta">
      <p class="doctype">${escapeHtml(meta.documentType)}</p>
      <p class="docno">No. ${escapeHtml(meta.documentNumber)}</p>
      ${docdateLine}
    </div>
  </header>`;
}

/** @deprecated Use buildRunHeader — kept for unit tests */
export const buildPageHeader = buildRunHeader;

export function buildRunFooter(options: DocumentLayoutOptions): string {
  const { company, meta } = options;
  const audience = options.audience || 'client';
  const verifyUrl =
    meta.verificationUrl || publicDocumentVerifyUrl(meta.documentNumber);
  const legalName = company.legalName || company.name || 'Nestlancer';

  if (audience === 'admin') {
    return `<footer class="run-footer">
      <div>
        <p class="confidential">Confidential — Admin Copy</p>
        <p>Doc: ${escapeHtml(meta.documentNumber)}${meta.triggerEvent ? ` · Trigger: ${escapeHtml(meta.triggerEvent)}` : ''}</p>
      </div>
      <div style="text-align:right">
        <p>${escapeHtml(company.website || 'nestlancer.com/admin')}</p>
      </div>
    </footer>`;
  }

  const gstLine = company.gst ? ` · GSTIN ${escapeHtml(company.gst)}` : '';
  return `<footer class="run-footer">
    <p class="company-line">${escapeHtml(legalName)}${gstLine}</p>
    <p>Verify: <span class="verify">${escapeHtml(verifyUrl)}</span></p>
    <p>${escapeHtml(meta.notes || 'Computer-generated document.')}${company.email ? ` For queries: ${escapeHtml(company.email)}` : ''}</p>
  </footer>`;
}

export function buildProjectBanner(title: string, label = 'Project'): string {
  if (!title) return '';
  return `<div class="project-banner avoid-break">
    <p class="label">${escapeHtml(label)}</p>
    <p class="title">${escapeHtml(title)}</p>
  </div>`;
}

export function buildGstParties(
  leftLabel: string,
  left: CompanyBranding | ClientBranding,
  rightLabel: string,
  right: ClientBranding | CompanyBranding,
): string {
  const leftName = 'legalName' in left && left.legalName ? left.legalName : left.name;
  const rightName = 'legalName' in right && right.legalName ? right.legalName : right.name;

  const leftGst =
    'gst' in left && left.gst ? `<p class="gstin">GSTIN: ${escapeHtml(left.gst)}</p>` : '';
  const leftPan = 'pan' in left && left.pan ? `<p>PAN: ${escapeHtml(left.pan)}</p>` : '';
  const leftCin = 'cin' in left && left.cin ? `<p>CIN: ${escapeHtml(String(left.cin))}</p>` : '';
  const leftContact = [left.email, 'phone' in left && left.phone ? left.phone : undefined].filter(
    Boolean,
  );
  const rightState =
    right.state && right.stateCode
      ? `<p>State: ${escapeHtml(right.state)} (${escapeHtml(right.stateCode)})</p>`
      : '';
  const rightGst =
    'gstin' in right
      ? `<p>${right.gstin ? `GSTIN: ${escapeHtml(String(right.gstin))}` : 'GSTIN: Unregistered'}</p>`
      : '';

  return `<div class="gst-parties avoid-break">
    <div class="gst-box">
      <div class="gst-box-head">${escapeHtml(leftLabel)}</div>
      <div class="gst-box-body">
        <p class="name">${escapeHtml(leftName || '')}</p>
        ${renderAddressHtml(left.address)}
        ${leftGst}${leftPan}${leftCin}
        ${leftContact.length ? `<p>${leftContact.map((p) => escapeHtml(String(p))).join(' · ')}</p>` : ''}
      </div>
    </div>
    <div class="gst-box">
      <div class="gst-box-head">${escapeHtml(rightLabel)}</div>
      <div class="gst-box-body">
        <p class="name">${escapeHtml(rightName || '')}</p>
        ${renderAddressHtml(right.address)}
        ${right.email ? `<p>${escapeHtml(right.email)}</p>` : ''}
        ${rightState}${rightGst}
      </div>
    </div>
  </div>`;
}

export function buildTotalsPanel(
  rows: Array<{ label: string; value: string; isTotal?: boolean }>,
  options?: { avoidBreak?: boolean },
): string {
  const rowHtml = rows
    .map((row) => {
      const cls = row.isTotal ? 'row total-row' : 'row';
      return `<div class="${cls}"><span>${escapeHtml(row.label)}</span><span class="value">${escapeHtml(row.value)}</span></div>`;
    })
    .join('');
  const breakCls = options?.avoidBreak === false ? '' : ' avoid-break';
  return `<div class="totals-panel${breakCls}"><div class="totals-box">${rowHtml}</div></div>`;
}

export function buildPuppeteerHeaderTemplate(options: DocumentLayoutOptions): string {
  const { company, meta } = options;
  const logoUri = getLogoFullDataUri();

  return `<div style="width:100%; font-size:9px; padding:0 14mm; color:${BRAND_COLORS.muted}; border-bottom:1px solid ${BRAND_COLORS.border}; display:flex; justify-content:space-between; align-items:center;">
    <img src="${logoUri}" style="height:22px; width:auto;" />
    <div style="text-align:right;">
      <span style="font-weight:600; color:${BRAND_COLORS.navy};">${escapeHtml(meta.documentType)}</span>
      <span> · ${escapeHtml(meta.documentNumber)}</span>
      <span> · ${escapeHtml(company.name || 'Nestlancer')}</span>
    </div>
  </div>`;
}

export function buildPuppeteerFooterTemplate(options: DocumentLayoutOptions): string {
  const { meta } = options;
  const verify = meta.verificationUrl || 'nestlancer.com';

  return `<div style="width:100%; font-size:8px; padding:0 14mm; color:${BRAND_COLORS.muted}; border-top:1px solid ${BRAND_COLORS.border}; display:flex; justify-content:space-between;">
    <span>${escapeHtml(meta.documentNumber)}</span>
    <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    <span>${escapeHtml(verify)}</span>
  </div>`;
}

export function wrapDocumentHtml(bodyContent: string, options: DocumentLayoutOptions): string {
  const audience = options.audience || 'client';
  const adminBanner = audience === 'admin' ? buildAdminBanner(options) : '';
  const internalMeta =
    audience === 'admin' && options.internalMeta?.length
      ? buildInternalMeta(options.internalMeta)
      : '';
  const docClass = options.documentClass ? ` ${escapeHtml(options.documentClass)}` : '';
  const headerVariant = options.compactHeader ? 'compact' : 'full';
  const runHeader = options.suppressRunHeader ? '' : buildRunHeader(options, headerVariant);
  const { meta } = options;

  const projectBlock =
    options.projectTitle && options.compactProject
      ? `<p class="quote-project-line avoid-break"><span class="label">Project</span> <strong>${escapeHtml(options.projectTitle)}</strong></p>`
      : options.projectTitle
        ? buildProjectBanner(options.projectTitle, options.projectBannerLabel)
        : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(meta.documentType)} ${escapeHtml(meta.documentNumber)}</title>
  ${getBaseStyles()}
</head>
<body class="audience-${audience}${docClass}">
  ${buildWatermark()}
  <div class="page-content">
    ${adminBanner}
    ${runHeader}
    ${internalMeta}
    ${projectBlock}
    ${bodyContent}
    ${buildRunFooter(options)}
  </div>
</body>
</html>`;
}

export function extractLayoutOptions(data: Record<string, unknown>): DocumentLayoutOptions {
  const company = (data.company as DocumentLayoutOptions['company']) || {};
  const client = (data.client as DocumentLayoutOptions['client']) || undefined;
  const audience = resolveAudience(data);
  const documentType = String(data.documentType || data._documentType || 'Document');
  const documentNumber = String(
    data.documentNumber ||
      data.invoiceNumber ||
      data.quoteNumber ||
      data.receiptNumber ||
      data.contractNumber ||
      data.reminderNumber ||
      'DOC-000',
  );

  const date = String(
    data.documentDate ||
      data.invoiceDate ||
      data.quoteDate ||
      data.receiptDate ||
      data.acceptedAt ||
      '',
  );

  const verificationUrl = data.verificationUrl
    ? String(data.verificationUrl)
    : publicDocumentVerifyUrl(documentNumber);

  const projectRecord =
    data.project && typeof data.project === 'object'
      ? (data.project as Record<string, unknown>)
      : null;

  return {
    audience,
    company,
    client,
    projectTitle: String(data.projectTitle || projectRecord?.title || ''),
    projectBannerLabel: data.projectBannerLabel ? String(data.projectBannerLabel) : undefined,
    internalMeta: Array.isArray(data.internalMeta)
      ? (data.internalMeta as InternalMetaCell[])
      : undefined,
    meta: {
      documentType,
      documentNumber,
      date: date || undefined,
      verificationUrl,
      notes: data.notes ? String(data.notes) : undefined,
      status: data.status ? String(data.status) : undefined,
      generatedAt: data.generatedAt ? String(data.generatedAt) : undefined,
      triggerEvent: data.triggerEvent ? String(data.triggerEvent) : undefined,
      extraLines: Array.isArray(data.extraLines) ? (data.extraLines as string[]) : undefined,
    },
  };
}

export function buildPageFooter(options: DocumentLayoutOptions): string {
  return buildRunFooter(options);
}
