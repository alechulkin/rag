#!/usr/bin/env node
/**
 * Traceability checker — maps MVP capability-plan matrix row IDs to OpenSpec
 * delta specs (phase docs) and optionally to @trace tags in test files (phase full).
 *
 * Usage:
 *   node scripts/check-traceability.mjs [--phase docs|full] [--write]
 *   node scripts/check-traceability.mjs --check-fresh [--phase docs|full]
 */
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  existsSync,
  mkdirSync,
} from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PLAN = join(ROOT, 'docs/mvp-capability-plan.md');
const REPORT = join(ROOT, 'docs/qa/traceability-report.md');

const ROW_ID_RE =
  /\b(FND-\d+|ING-AC\d+|SRCH-AC\d+|CHAT-AC\d+|EVAL-AC\d+|ADM-AC\d+|OBS-AC\d+|RET-(?:DOC|CHAT|AUDIT))\b/g;

const SLICE_NUM_TO_CHANGE = {
  1: { change: 'foundation-slice', label: 'foundation' },
  2: { change: 'ingestion-slice', label: 'ingestion' },
  3: { change: 'chat-slice', label: 'chat' },
  4: { change: 'admin-slice', label: 'admin' },
  5: { change: 'evaluation-slice', label: 'evaluation' },
  6: { change: 'hardening-slice', label: 'hardening' },
};

const args = process.argv.slice(2);
const phase = args.includes('--phase')
  ? args[args.indexOf('--phase') + 1]
  : 'docs';
const checkFresh = args.includes('--check-fresh');
const writeReport = args.includes('--write') || checkFresh || !args.includes('--stdout-only');

if (!['docs', 'full'].includes(phase)) {
  console.error('Invalid --phase; use docs or full');
  process.exit(1);
}

function walk(dir, pred) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const st = statSync(path);
    if (st.isDirectory()) out.push(...walk(path, pred));
    else if (pred(path)) out.push(path);
  }
  return out;
}

function parsePlanMatrix(planText) {
  const slices = [];
  const sliceHeaderRe = /^### Slice (\d+) — ([^\n]+)/gm;
  const headers = [...planText.matchAll(sliceHeaderRe)];
  for (let i = 0; i < headers.length; i++) {
    const num = Number(headers[i][1]);
    const meta = SLICE_NUM_TO_CHANGE[num];
    if (!meta) continue;
    const start = headers[i].index;
    const end = i + 1 < headers.length ? headers[i + 1].index : planText.length;
    const section = planText.slice(start, end);
    const ids = [...new Set(section.match(ROW_ID_RE) ?? [])].sort();
    slices.push({ name: meta.label, change: meta.change, ids });
  }
  return slices;
}

function readSpecTexts(changeDir) {
  const specDir = join(changeDir, 'specs');
  return walk(specDir, (p) => p.endsWith('spec.md')).map((p) =>
    readFileSync(p, 'utf8'),
  );
}

function findTestTraces() {
  const patterns = [
    join(ROOT, 'src'),
    join(ROOT, 'frontend'),
  ];
  const traces = new Map();
  for (const base of patterns) {
    for (const file of walk(base, (p) =>
      /Test\.java$/.test(p) || /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(p),
    )) {
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(/@trace\s+(FND-\d+|ING-AC\d+|SRCH-AC\d+|CHAT-AC\d+|EVAL-AC\d+|ADM-AC\d+|OBS-AC\d+|RET-(?:DOC|CHAT|AUDIT))/g)) {
        const id = m[1];
        if (!traces.has(id)) traces.set(id, []);
        traces.get(id).push(relative(ROOT, file));
      }
    }
  }
  return traces;
}

const planText = readFileSync(PLAN, 'utf8');
const slices = parsePlanMatrix(planText);
const failures = [];
const lines = [
  '# Traceability Report',
  '',
  `Generated: ${new Date().toISOString()}`,
  `Phase: \`${phase}\``,
  '',
  'Source plan: [docs/mvp-capability-plan.md](../mvp-capability-plan.md) §1.',
  '',
];

for (const slice of slices) {
  const change = slice.change;
  const changeDir = join(ROOT, 'openspec/changes', change);
  lines.push(`## ${slice.name} (\`${change}\`)`);
  lines.push('');

  if (!existsSync(changeDir)) {
    lines.push(`Status: **skipped** — OpenSpec change not proposed yet.`);
    lines.push(`Row IDs (${slice.ids.length}): ${slice.ids.join(', ') || 'none'}`);
    lines.push('');
    continue;
  }

  const specTexts = readSpecTexts(changeDir);
  const specBlob = specTexts.join('\n');
  const missingInSpecs = slice.ids.filter((id) => !specBlob.includes(id));

  if (missingInSpecs.length > 0) {
    failures.push(
      `${change}: missing in specs — ${missingInSpecs.join(', ')}`,
    );
    lines.push(`Status: **FAIL** — ${missingInSpecs.length} row ID(s) not cited in \`specs/**/spec.md\`.`);
    lines.push(`Missing: ${missingInSpecs.join(', ')}`);
  } else {
    lines.push(`Status: **pass** — all ${slice.ids.length} row ID(s) cited in delta specs.`);
  }
  lines.push(`Row IDs: ${slice.ids.join(', ') || 'none'}`);
  lines.push('');

  if (phase === 'full') {
    const testTraces = findTestTraces();
    const missingInTests = slice.ids.filter((id) => !testTraces.has(id));
    lines.push('### Test @trace coverage');
    if (missingInTests.length > 0) {
      failures.push(
        `${change}: missing @trace in tests — ${missingInTests.join(', ')}`,
      );
      lines.push(`FAIL — missing: ${missingInTests.join(', ')}`);
    } else if (slice.ids.length === 0) {
      lines.push('N/A');
    } else {
      lines.push(`pass — all row IDs have ≥1 @trace tag`);
    }
    for (const id of slice.ids) {
      const files = testTraces.get(id);
      if (files?.length) lines.push(`- \`${id}\`: ${files.join(', ')}`);
    }
    lines.push('');
  }
}

lines.push('## Summary');
lines.push('');
lines.push(failures.length === 0 ? '**0 failure(s)**' : `**${failures.length} failure(s)**`);
if (failures.length) {
  for (const f of failures) lines.push(`- ${f}`);
}

const report = `${lines.join('\n')}\n`;

if (checkFresh) {
  if (!existsSync(REPORT)) {
    console.error('traceability-report.md missing; run with --write first');
    process.exit(1);
  }
  const committed = readFileSync(REPORT, 'utf8');
  const normalize = (s) =>
    s.replace(/^Generated: .+$/m, 'Generated: <timestamp>');
  if (normalize(committed) !== normalize(report)) {
    console.error('traceability-report.md is stale; regenerate with --write');
    process.exit(1);
  }
  console.log('traceability report fresh');
}

if (writeReport) {
  mkdirSync(join(ROOT, 'docs/qa'), { recursive: true });
  writeFileSync(REPORT, report);
  console.log(`wrote ${relative(ROOT, REPORT)}`);
}

if (failures.length > 0) {
  console.error(`${failures.length} traceability failure(s)`);
  process.exit(1);
}

console.log('traceability OK');
