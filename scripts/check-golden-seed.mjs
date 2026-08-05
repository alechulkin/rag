#!/usr/bin/env node
/**
 * Validates docs/eval/golden-seed.yaml against PRD §04 §5.1 schema rules.
 */
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SEED = join(ROOT, 'docs/eval/golden-seed.yaml');

const REQUIRED = [
  'id',
  'question',
  'scope',
  'expectedAnswer',
  'expectedSources',
  'requiredKeywords',
  'forbiddenKeywords',
  'expectedBehavior',
  'tags',
  'status',
];
const BEHAVIORS = new Set(['answer', 'refuse']);
const STATUSES = new Set(['active', 'stale', 'disabled']);

function loadYaml(text) {
  // Minimal YAML parser for this file's structure (no external deps).
  const sections = { benchmark: [], refusal: [], negativeAcl: [] };
  let current = null;
  let item = null;
  let key = null;
  let list = null;

  const flush = () => {
    if (item && current) sections[current].push(item);
    item = null;
    key = null;
    list = null;
  };

  for (const raw of text.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (/^(\w+):\s*$/.test(line) && !line.startsWith(' ')) {
      flush();
      current = line.slice(0, -1);
      continue;
    }
    if (/^  - id:/.test(line)) {
      flush();
      item = { id: line.split(':')[1].trim() };
      continue;
    }
    if (!item) continue;
    const kv = line.match(/^    (\w+):\s*(.*)$/);
    if (kv) {
      key = kv[1];
      const val = kv[2].trim();
      if (val === '') {
        list = [];
        item[key] = list;
      } else if (val.startsWith('[')) {
        item[key] = val
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean);
      } else {
        item[key] = val.replace(/^['"]|['"]$/g, '');
      }
      continue;
    }
    const li = line.match(/^      - (.+)$/);
    if (li && list) {
      list.push(li[1].trim().replace(/^['"]|['"]$/g, ''));
    }
  }
  flush();
  return sections;
}

const text = readFileSync(SEED, 'utf8');
const data = loadYaml(text);
const failures = [];
const seen = new Set();

for (const [section, items] of Object.entries(data)) {
  if (!items.length) failures.push(`${section}: empty section`);
  for (const item of items) {
    for (const field of REQUIRED) {
      if (item[field] === undefined || item[field] === '') {
        failures.push(`${item.id ?? '?'}: missing ${field}`);
      }
    }
    if (item.id) {
      if (seen.has(item.id)) failures.push(`${item.id}: duplicate id`);
      seen.add(item.id);
    }
    if (item.expectedBehavior && !BEHAVIORS.has(item.expectedBehavior)) {
      failures.push(`${item.id}: invalid expectedBehavior`);
    }
    if (item.status && !STATUSES.has(item.status)) {
      failures.push(`${item.id}: invalid status`);
    }
    if (section === 'refusal' && item.expectedBehavior !== 'refuse') {
      failures.push(`${item.id}: refusal section must expect refuse`);
    }
    if (section === 'negativeAcl' && item.expectedBehavior !== 'refuse') {
      failures.push(`${item.id}: negativeAcl section must expect refuse`);
    }
  }
}

const counts = {
  benchmark: data.benchmark.length,
  refusal: data.refusal.length,
  negativeAcl: data.negativeAcl.length,
};

if (counts.benchmark !== 50) failures.push(`benchmark: expected 50 cases, got ${counts.benchmark}`);
if (counts.refusal < 8) failures.push(`refusal: expected ≥8 cases, got ${counts.refusal}`);
if (counts.negativeAcl < 8) failures.push(`negativeAcl: expected ≥8 cases, got ${counts.negativeAcl}`);

if (failures.length) {
  console.error(`golden-seed validation failed (${failures.length}):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

console.log(
  `golden-seed OK (${counts.benchmark} benchmark, ${counts.refusal} refusal, ${counts.negativeAcl} negativeAcl)`,
);
