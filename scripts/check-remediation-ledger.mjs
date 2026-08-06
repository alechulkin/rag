#!/usr/bin/env node
/**
 * Validate a bounded remediation ledger markdown file.
 *
 * Required:
 *   - heading `# Remediation Ledger`
 *   - `Max attempts:` positive integer ≤ 5
 *   - zero or more finding blocks with fields:
 *     id, severity, owner, attempt, disposition, evidence
 *   - disposition ∈ open|fixed|wontfix|deferred
 *   - attempt ≥ 1 and ≤ Max attempts
 *   - open findings must have Next action
 *
 * Usage:
 *   node scripts/check-remediation-ledger.mjs --file <path>
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const fileIdx = args.indexOf('--file');
const file = fileIdx >= 0 ? args[fileIdx + 1] : null;

if (!file) {
  console.error('Usage: node scripts/check-remediation-ledger.mjs --file <path>');
  process.exit(1);
}

const path = resolve(file);
if (!existsSync(path)) {
  console.error(`missing ledger: ${path}`);
  process.exit(1);
}

const raw = readFileSync(path, 'utf8');
const text = raw.replace(/<!--[\s\S]*?-->/g, '');
const failures = [];

if (!/^# Remediation Ledger\s*$/m.test(text)) {
  failures.push('missing `# Remediation Ledger` heading');
}

const maxMatch = text.match(/^Max attempts:\s*(\d+)\s*$/m);
if (!maxMatch) {
  failures.push('missing `Max attempts: <n>` line');
}
const maxAttempts = maxMatch ? Number(maxMatch[1]) : 0;
if (maxMatch && (maxAttempts < 1 || maxAttempts > 5)) {
  failures.push('Max attempts must be 1..5');
}

const DISPOSITIONS = new Set(['open', 'fixed', 'wontfix', 'deferred']);
const findingRe = /^### (FIND-\d+)\s*$/gm;
const findings = [...text.matchAll(findingRe)];

for (let i = 0; i < findings.length; i++) {
  const id = findings[i][1];
  const start = findings[i].index + findings[i][0].length;
  const end = i + 1 < findings.length ? findings[i + 1].index : text.length;
  const body = text.slice(start, end);

  const field = (name) => {
    const m = body.match(new RegExp(`^-\\s*${name}:\\s*(.+)\\s*$`, 'mi'));
    return m ? m[1].trim() : null;
  };

  const severity = field('Severity');
  const owner = field('Owner');
  const attempt = field('Attempt');
  const disposition = field('Disposition');
  const evidence = field('Evidence');
  const next = field('Next action');

  if (!severity) failures.push(`${id}: missing Severity`);
  if (!owner) failures.push(`${id}: missing Owner`);
  if (!attempt || !/^\d+$/.test(attempt)) {
    failures.push(`${id}: Attempt must be positive integer`);
  } else {
    const n = Number(attempt);
    if (n < 1 || (maxAttempts && n > maxAttempts)) {
      failures.push(`${id}: Attempt ${n} outside 1..${maxAttempts}`);
    }
  }
  if (!disposition || !DISPOSITIONS.has(disposition.toLowerCase())) {
    failures.push(
      `${id}: Disposition must be open|fixed|wontfix|deferred`,
    );
  }
  if (!evidence) failures.push(`${id}: missing Evidence`);
  if (disposition && disposition.toLowerCase() === 'open' && !next) {
    failures.push(`${id}: open finding requires Next action`);
  }
}

if (failures.length) {
  console.error(`remediation ledger failed (${failures.length}):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

console.log(
  `remediation ledger OK (${findings.length} finding(s), maxAttempts=${maxAttempts})`,
);
