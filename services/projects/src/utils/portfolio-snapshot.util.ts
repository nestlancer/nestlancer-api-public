const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/g;

export function sanitizePublicText(text: string, maxLength?: number): string {
  let cleaned = text.replace(EMAIL_RE, '[redacted]').replace(PHONE_RE, '[redacted]').trim();
  if (maxLength && cleaned.length > maxLength) {
    cleaned = `${cleaned.slice(0, maxLength - 1).trim()}…`;
  }
  return cleaned;
}

export function slugifyTitle(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  return base || 'portfolio-item';
}

export function computeDurationLabel(
  startDate: Date | null | undefined,
  completedAt: Date | null | undefined,
): string | undefined {
  if (!startDate || !completedAt) return undefined;
  const ms = completedAt.getTime() - startDate.getTime();
  if (ms <= 0) return undefined;
  const weeks = Math.round(ms / (7 * 24 * 60 * 60 * 1000));
  if (weeks < 4) return `${Math.max(1, weeks)} week${weeks === 1 ? '' : 's'}`;
  const months = Math.round(ms / (30 * 24 * 60 * 60 * 1000));
  return `${Math.max(1, months)} month${months === 1 ? '' : 's'}`;
}

export function parseTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((t) => String(t).trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function buildCaseStudyMarkdown(params: {
  title: string;
  description: string;
  milestoneNames: string[];
}): string {
  const milestones =
    params.milestoneNames.length > 0
      ? params.milestoneNames.map((m) => `- ${m}`).join('\n')
      : '- Delivery milestones completed on schedule';
  return `## Overview\n\n${params.description}\n\n## Approach\n\n${milestones}\n\n## Outcome\n\n_Add results and impact here before publishing._`;
}
