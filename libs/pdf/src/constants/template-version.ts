/** Bump when PDF HTML/CSS layout changes so cached S3 documents are regenerated. */
export const PDF_TEMPLATE_VERSION = '2026-08-05-9dba4f7';

export function readPdfTemplateVersion(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== 'object') return undefined;
  const version = (metadata as Record<string, unknown>).templateVersion;
  return typeof version === 'string' ? version : undefined;
}

export function isPdfTemplateStale(metadata: unknown): boolean {
  return readPdfTemplateVersion(metadata) !== PDF_TEMPLATE_VERSION;
}
