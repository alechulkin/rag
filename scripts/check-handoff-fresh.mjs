#!/usr/bin/env node
/**
 * Ensure docs/current-state.md was updated for a slice after its work landed
 * (quality-gates G4 — handoff last).
 *
 * Usage:
 *   node scripts/check-handoff-fresh.mjs --slice <slice>
 *
 * Fails when:
 *   - newest current-state entry omits the slice name
 *   - newest entry timestamp predates the slice baseline (green-run timestamp,
 *     else latest git commit on the change dir, else newest file mtime),
 *     allowing a 10-minute write-then-commit skew
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const CURRENT_STATE = join(ROOT, 'docs/current-state.md');
const SKEW_MS = 10 * 60 * 1000;

const args = process.argv.slice(2);
const sliceIdx = args.indexOf('--slice');
const slice = sliceIdx >= 0 ? args[sliceIdx + 1] : null;

if (!slice) {
  console.error('Usage: node scripts/check-handoff-fresh.mjs --slice <slice>');
  process.exit(1);
}

function resolveChangeDir(change) {
  const active = join(ROOT, 'openspec/changes', change);
  if (existsSync(active) && statSync(active).isDirectory()) {
    return { dir: active, location: 'active' };
  }
  const archiveRoot = join(ROOT, 'openspec/changes/archive');
  if (!existsSync(archiveRoot)) return null;
  const matches = readdirSync(archiveRoot)
    .filter((name) => {
      const full = join(archiveRoot, name);
      return (
        statSync(full).isDirectory() &&
        (name === change || name.endsWith(`-${change}`))
      );
    })
    .sort()
    .reverse();
  if (!matches.length) return null;
  return { dir: join(archiveRoot, matches[0]), location: 'archive' };
}

function parseNewestEntry(text) {
  const headingRe = /^## (\d{4}-\d{2}-\d{2}T[^\n]+)\s*$/gm;
  const first = headingRe.exec(text);
  if (!first) return null;
  const timestamp = first[1].trim();
  const bodyStart = first.index + first[0].length;
  const next = headingRe.exec(text);
  const bodyEnd = next ? next.index : text.length;
  const body = text.slice(bodyStart, bodyEnd);
  const ms = Date.parse(timestamp);
  if (Number.isNaN(ms)) return null;
  return { timestamp, body, ms };
}

function gitCommitIso(path) {
  const result = spawnSync(
    'git',
    ['-C', ROOT, 'log', '-1', '--format=%cI', '--', path],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) return null;
  const out = (result.stdout || '').trim();
  return out || null;
}

/** Newest mtime under dir — fallback when git history unavailable (sandbox / untracked). */
function newestMtimeIso(dir) {
  let newest = 0;
  const walk = (d) => {
    for (const entry of readdirSync(d)) {
      const path = join(d, entry);
      const st = statSync(path);
      if (st.isDirectory()) walk(path);
      else if (st.mtimeMs > newest) newest = st.mtimeMs;
    }
  };
  walk(dir);
  if (!newest) return null;
  return new Date(newest).toISOString();
}

const resolved = resolveChangeDir(slice);
if (!resolved) {
  console.error(`slice not found (active or archive): ${slice}`);
  process.exit(1);
}

if (!existsSync(CURRENT_STATE)) {
  console.error('docs/current-state.md missing');
  process.exit(1);
}

const entry = parseNewestEntry(readFileSync(CURRENT_STATE, 'utf8'));
if (!entry) {
  console.error('docs/current-state.md: no parseable newest ## ISO-8601 entry');
  process.exit(1);
}

const sliceAliases = new Set([
  slice,
  slice.replace(/-slice$/, ''),
]);
const mentionsSlice = [...sliceAliases].some((alias) =>
  entry.body.toLowerCase().includes(alias.toLowerCase()),
);
if (!mentionsSlice) {
  console.error(
    `handoff fresh failed: newest entry (${entry.timestamp}) omits slice "${slice}"`,
  );
  process.exit(1);
}

const failures = [];
let baselineIso = null;
let baselineSource = null;

const greenPath = join(resolved.dir, 'evidence', 'green-run.json');
if (existsSync(greenPath)) {
  try {
    const green = JSON.parse(readFileSync(greenPath, 'utf8'));
    if (typeof green.timestamp === 'string' && !Number.isNaN(Date.parse(green.timestamp))) {
      baselineIso = green.timestamp;
      baselineSource = 'evidence/green-run.json';
    }
  } catch {
    failures.push(`unreadable ${relative(ROOT, greenPath)}`);
  }
}

if (!baselineIso) {
  baselineIso = gitCommitIso(resolved.dir);
  if (baselineIso) baselineSource = `git log ${relative(ROOT, resolved.dir)}`;
}

if (!baselineIso) {
  baselineIso = newestMtimeIso(resolved.dir);
  if (baselineIso) baselineSource = `mtime ${relative(ROOT, resolved.dir)}`;
}

if (!baselineIso) {
  failures.push(
    `no baseline time (no green-run.json, git history, or files under ${relative(ROOT, resolved.dir)})`,
  );
} else {
  const baselineMs = Date.parse(baselineIso);
  if (entry.ms + SKEW_MS < baselineMs) {
    failures.push(
      `newest entry ${entry.timestamp} predates slice baseline ${baselineIso} (${baselineSource}); update current-state LAST`,
    );
  }
}

if (failures.length) {
  console.error(`handoff fresh failed (${failures.length}):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

console.log(
  `handoff fresh OK (${slice}, entry ${entry.timestamp} ≥ baseline ${baselineIso} via ${baselineSource})`,
);
