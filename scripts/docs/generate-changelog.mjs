#!/usr/bin/env node
/**
 * Builds CHANGELOG.md from conventional-commit git history.
 *
 * Output (identical):
 *   - CHANGELOG.md
 *   - docs/changelog/CHANGELOG.md
 *
 * Run: pnpm docs:changelog
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const outPath = path.join(root, 'docs/changelog/CHANGELOG.md');
const rootPath = path.join(root, 'CHANGELOG.md');

const SECTION_ORDER = ['Added', 'Fixed', 'Changed', 'Documentation', 'Tests', 'Removed'];

const TYPE_TO_SECTION = {
  feat: 'Added',
  fix: 'Fixed',
  docs: 'Documentation',
  refactor: 'Changed',
  perf: 'Changed',
  style: 'Changed',
  chore: 'Changed',
  ci: 'Changed',
  build: 'Changed',
  test: 'Tests',
  revert: 'Removed',
};

/** @returns {{ type: string, scope: string, description: string, breaking: boolean } | null} */
function parseConventional(subject) {
  const m = subject.match(/^(\w+)(?:\(([^)]*)\))?(!)?:\s*(.+)$/);
  if (!m) return null;
  return {
    type: m[1].toLowerCase(),
    scope: (m[2] || '').trim(),
    breaking: Boolean(m[3]),
    description: m[4].trim(),
  };
}

function categorize(subject) {
  const parsed = parseConventional(subject);
  if (!parsed) return 'Changed';
  return TYPE_TO_SECTION[parsed.type] || 'Changed';
}

/** Clean subject for display: strip cci/markdown links, collapse whitespace, truncate. */
function cleanSubject(subject) {
  let s = subject;
  s = s.replace(/\[([^\]]*)\]\(cci:[^)]+\)/g, '$1');
  s = s.replace(/\[([^\]]*)\]\([^)]+\)/g, '$1');
  s = s.replace(/\s+/g, ' ').trim();
  if (s.length > 200) s = `${s.slice(0, 197)}…`;
  return s;
}

/**
 * Format a changelog bullet.
 * Conventional: `- **scope** — description (\`hash\`, date)`
 * Plain:        `- description (\`hash\`, date)`
 */
function formatEntry(subject, hash, date) {
  const cleaned = cleanSubject(subject);
  const parsed = parseConventional(cleaned);
  const meta = `(\`${hash}\`, ${date})`;

  if (!parsed) {
    return `- ${cleaned} ${meta}`;
  }

  const desc = parsed.breaking ? `${parsed.description} **[BREAKING]**` : parsed.description;
  if (parsed.scope) {
    return `- **${parsed.scope}** — ${desc} ${meta}`;
  }
  return `- ${desc} ${meta}`;
}

const raw = execSync('git log --pretty=format:"%ad|%h|%s" --date=short', {
  cwd: root,
  encoding: 'utf8',
});

const lines = raw.trim().split('\n').filter(Boolean);
const byMonth = new Map();

for (const line of lines) {
  const [date, hash, ...rest] = line.split('|');
  const subject = rest.join('|');
  const month = date.slice(0, 7);
  if (!byMonth.has(month)) byMonth.set(month, []);
  byMonth.get(month).push({ date, hash, subject });
}

const months = [...byMonth.keys()].sort((a, b) => b.localeCompare(a));
const firstDate = lines.length ? lines[lines.length - 1].split('|')[0] : 'n/a';
const lastDate = lines.length ? lines[0].split('|')[0] : 'n/a';

const shallowNote =
  lines.length < 10
    ? `
> **Note:** this checkout only has ${lines.length} commit(s). Re-run \`pnpm docs:changelog\` after a full-history clone to regenerate a complete changelog.
`
    : '';

let md = `# Changelog

All notable changes to the **Nestlancer Backend API** are documented here.

- Style: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
- Generated from git history by \`scripts/docs/generate-changelog.mjs\` (\`pnpm docs:changelog\`)
- Coverage: **${lines.length} commits** (${firstDate} → ${lastDate})
${shallowNote}
## [Unreleased]

### Added

- Documentation overhaul: \`docs/components/\` for every service, worker, and library
- K3s/Terraform manifests and staging CD pipeline

---

`;

for (const month of months) {
  const entries = byMonth.get(month);
  md += `## ${month}\n\n`;
  md += `_${entries.length} commit${entries.length === 1 ? '' : 's'}_\n\n`;

  /** @type {Record<string, string[]>} */
  const groups = Object.fromEntries(SECTION_ORDER.map((s) => [s, []]));

  for (const e of entries) {
    const section = categorize(e.subject);
    groups[section].push(formatEntry(e.subject, e.hash, e.date));
  }

  for (const section of SECTION_ORDER) {
    const items = groups[section];
    if (!items.length) continue;
    md += `### ${section}\n\n${items.join('\n')}\n\n`;
  }

  md += '---\n\n';
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, md);
fs.writeFileSync(rootPath, md);
console.log(`Wrote ${outPath}`);
console.log(`Wrote ${rootPath}`);
console.log(`Commits: ${lines.length} | Months: ${months.join(', ')}`);
