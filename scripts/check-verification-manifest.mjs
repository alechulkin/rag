#!/usr/bin/env node
/**
 * Validate docs/qa/verification-manifest.json structure and that referenced
 * local scripts exist. Does not execute the gate commands.
 *
 * Usage:
 *   node scripts/check-verification-manifest.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const MANIFEST = join(ROOT, 'docs/qa/verification-manifest.json');

const REQUIRED_SECTIONS = [
  'blockingDocs',
  'sliceClose',
  'advisory',
  'foundationPlus',
  'humanGates',
];

function extractScriptPath(command) {
  const m = String(command).match(/\b(?:node|nodejs)\s+(scripts\/[^\s]+)/);
  return m ? m[1] : null;
}

if (!existsSync(MANIFEST)) {
  console.error('missing docs/qa/verification-manifest.json');
  process.exit(1);
}

let data;
try {
  data = JSON.parse(readFileSync(MANIFEST, 'utf8'));
} catch (err) {
  console.error(`invalid JSON: ${err.message}`);
  process.exit(1);
}

const failures = [];
if (data.version !== 1) failures.push('version must be 1');
for (const key of REQUIRED_SECTIONS) {
  if (!Array.isArray(data[key])) failures.push(`missing array section: ${key}`);
}

const seen = new Set();
for (const key of REQUIRED_SECTIONS) {
  if (!Array.isArray(data[key])) continue;
  for (const gate of data[key]) {
    if (!gate?.id) failures.push(`${key}: gate missing id`);
    if (gate?.id) {
      if (seen.has(gate.id)) failures.push(`duplicate gate id: ${gate.id}`);
      seen.add(gate.id);
    }
    if (!gate?.command && gate?.kind !== 'human') {
      failures.push(`${gate?.id ?? key}: missing command`);
    }
    if (typeof gate?.blocking !== 'boolean' && key !== 'humanGates') {
      // humanGates may omit; others need blocking flag
      if (key !== 'advisory') {
        failures.push(`${gate?.id ?? key}: missing boolean blocking`);
      }
    }
    const script = gate?.command ? extractScriptPath(gate.command) : null;
    if (script && !existsSync(join(ROOT, script))) {
      failures.push(`${gate.id}: missing script ${script}`);
    }
  }
}

if (!data.ciEvidence || typeof data.ciEvidence !== 'object') {
  failures.push('missing ciEvidence object');
} else {
  for (const field of ['artifactName', 'paths', 'notes']) {
    if (data.ciEvidence[field] === undefined) {
      failures.push(`ciEvidence missing ${field}`);
    }
  }
}

if (failures.length) {
  console.error(`verification manifest failed (${failures.length}):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

console.log(
  `verification manifest OK (${seen.size} gates, sections=${REQUIRED_SECTIONS.length})`,
);
