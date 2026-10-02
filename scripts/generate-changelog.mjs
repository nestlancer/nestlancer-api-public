#!/usr/bin/env node
/**
 * Builds CHANGELOG.md from git history (Conventional Commits grouped by month).
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outPath = path.join(root, 'docs/changelog/CHANGELOG.md');
const rootPath = path.join(root, 'CHANGELOG.md');

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

function categorize(subject) {
  const m = subject.match(/^(\w+)(?:\([^)]+\))?!?:/);
  const type = m ? m[1].toLowerCase() : 'other';
  const map = {
    feat: 'Added',
    fix: 'Fixed',
    docs: 'Documentation',
    refactor: 'Changed',
    perf: 'Changed',
    test: 'Tests',
    chore: 'Changed',
    ci: 'Changed',
    build: 'Changed',
    revert: 'Removed',
  };
  return map[type] || 'Changed';
}

const months = [...byMonth.keys()].sort((a, b) => b.localeCompare(a));

let md = `# Changelog

All notable changes to the **Nestlancer Backend API** are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
Entries are generated from git history (\`scripts/generate-changelog.mjs\`).

## [Unreleased]

### Added
- Documentation overhaul: \`docs/components/\` for every service, worker, and library
- K3s/Terraform manifests and staging CD pipeline

---

`;

for (const month of months) {
  const entries = byMonth.get(month);
  const [y, m] = month.split('-');
  const title = `${y}-${m} (${entries.length} commits)`;
  md += `## ${title}\n\n`;

  const groups = { Added: [], Fixed: [], Changed: [], Documentation: [], Tests: [], Removed: [] };
  for (const e of entries) {
    const cat = categorize(e.subject);
    let subject = e.subject;
    // Strip IDE/chat artifact links and raw markdown from commit messages
    subject = subject.replace(/\[([^\]]*)\]\(cci:[^)]+\)/g, '$1');
    subject = subject.replace(/\[([^\]]*)\]\([^)]+\)/g, '$1');
    subject = subject.replace(/\s+/g, ' ').trim();
    if (subject.length > 200) subject = `${subject.slice(0, 197)}…`;
    groups[cat].push(`- ${subject} (\`${e.hash}\`, ${e.date})`);
  }

  for (const [section, items] of Object.entries(groups)) {
    if (!items.length) continue;
    md += `### ${section}\n\n${items.join('\n')}\n\n`;
  }
  md += '---\n\n';
}

fs.writeFileSync(outPath, md);
fs.writeFileSync(rootPath, md);
console.log(`Wrote ${outPath} and ${rootPath} (${lines.length} commits)`);
