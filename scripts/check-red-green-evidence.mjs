#!/usr/bin/env node
/**
 * Validate red-first TDD evidence for an OpenSpec slice (quality-gates G4).
 *
 * Expects:
 *   openspec/changes/<slice>/evidence/red-run.json
 *   openspec/changes/<slice>/evidence/green-run.json
 * (also resolves archived changes under openspec/changes/archive/YYYY-MM-DD-<slice>/)
 *
 * Usage:
 *   node scripts/check-red-green-evidence.mjs --slice <slice>
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2);
const sliceIdx = args.indexOf('--slice');
const slice = sliceIdx >= 0 ? args[sliceIdx + 1] : null;

if (!slice) {
  console.error('Usage: node scripts/check-red-green-evidence.mjs --slice <slice>');
  process.exit(1);
}

const GIT_HEAD_RE = /^[0-9a-f]{7,40}$/i;

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

function loadJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    return { __error: err.message };
  }
}

function isIsoTimestamp(value) {
  if (typeof value !== 'string' || !value) return false;
  const t = Date.parse(value);
  return !Number.isNaN(t);
}

function validateRun(label, data, { expectFail }) {
  const failures = [];
  if (data.__error) {
    failures.push(`${label}: invalid JSON (${data.__error})`);
    return failures;
  }
  if (typeof data.exitCode !== 'number') {
    failures.push(`${label}: missing numeric exitCode`);
  } else if (expectFail && data.exitCode === 0) {
    failures.push(`${label}: exitCode must be non-zero`);
  } else if (!expectFail && data.exitCode !== 0) {
    failures.push(`${label}: exitCode must be 0`);
  }
  if (!Array.isArray(data.failingTests)) {
    failures.push(`${label}: failingTests must be an array`);
  } else if (expectFail && data.failingTests.length === 0) {
    failures.push(`${label}: failingTests must be non-empty`);
  } else if (!expectFail && data.failingTests.length !== 0) {
    failures.push(`${label}: failingTests must be empty on green`);
  }
  if (typeof data.gitHead !== 'string' || !GIT_HEAD_RE.test(data.gitHead)) {
    failures.push(`${label}: gitHead must be a 7–40 hex SHA`);
  }
  if (!isIsoTimestamp(data.timestamp)) {
    failures.push(`${label}: timestamp must be ISO 8601`);
  }
  return failures;
}

const resolved = resolveChangeDir(slice);
if (!resolved) {
  console.error(`slice not found (active or archive): ${slice}`);
  process.exit(1);
}

const evidenceDir = join(resolved.dir, 'evidence');
const redPath = join(evidenceDir, 'red-run.json');
const greenPath = join(evidenceDir, 'green-run.json');
const failures = [];

if (!existsSync(redPath)) failures.push(`missing ${redPath}`);
if (!existsSync(greenPath)) failures.push(`missing ${greenPath}`);

if (failures.length) {
  console.error(`red-green evidence failed (${failures.length}):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

const red = loadJson(redPath);
const green = loadJson(greenPath);
failures.push(...validateRun('red-run.json', red, { expectFail: true }));
failures.push(...validateRun('green-run.json', green, { expectFail: false }));

if (!red.__error && !green.__error && isIsoTimestamp(red.timestamp) && isIsoTimestamp(green.timestamp)) {
  if (Date.parse(red.timestamp) >= Date.parse(green.timestamp)) {
    failures.push('red timestamp must precede green timestamp');
  }
}
if (
  !red.__error &&
  !green.__error &&
  typeof red.gitHead === 'string' &&
  typeof green.gitHead === 'string' &&
  red.gitHead.toLowerCase() === green.gitHead.toLowerCase()
) {
  failures.push('red gitHead must differ from green gitHead (red observed before implementation)');
}

if (failures.length) {
  console.error(`red-green evidence failed (${failures.length}):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

console.log(
  `red-green evidence OK (${slice}, ${resolved.location}: red@${red.gitHead.slice(0, 7)} → green@${green.gitHead.slice(0, 7)})`,
);
