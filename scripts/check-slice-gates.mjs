#!/usr/bin/env node
/**
 * Slice-aware G4 gates for CI.
 *
 * For each OpenSpec change under openspec/changes/ (active + archive):
 *   - if evidence/ exists with any *-run.json → require valid red+green
 *   - if green-run.json exists → require handoff freshness
 *   - if remediation-ledger.md exists → validate ledger shape
 *
 * Slices with no evidence/ are skipped (docs-phase / not yet closed).
 *
 * Usage:
 *   node scripts/check-slice-gates.mjs
 *   node scripts/check-slice-gates.mjs --slice foundation-slice
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const CHANGES = join(ROOT, 'openspec/changes');
const ARCHIVE = join(CHANGES, 'archive');
const args = process.argv.slice(2);
const sliceArg = args.includes('--slice')
  ? args[args.indexOf('--slice') + 1]
  : null;

function listChangeDirs() {
  const out = [];
  if (!existsSync(CHANGES)) return out;
  for (const name of readdirSync(CHANGES)) {
    if (name === 'archive') continue;
    const dir = join(CHANGES, name);
    if (statSync(dir).isDirectory()) {
      out.push({ slice: name, dir, location: 'active' });
    }
  }
  if (existsSync(ARCHIVE)) {
    for (const name of readdirSync(ARCHIVE).sort().reverse()) {
      const dir = join(ARCHIVE, name);
      if (!statSync(dir).isDirectory()) continue;
      const slice = name.replace(/^\d{4}-\d{2}-\d{2}-/, '');
      if (out.some((c) => c.slice === slice)) continue;
      out.push({ slice, dir, location: 'archive' });
    }
  }
  return out;
}

function runNode(script, extraArgs) {
  const result = spawnSync(
    process.execPath,
    [join(ROOT, 'scripts', script), ...extraArgs],
    { encoding: 'utf8', cwd: ROOT },
  );
  return {
    status: result.status ?? 1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

const changes = listChangeDirs().filter((c) =>
  sliceArg ? c.slice === sliceArg || c.slice === `${sliceArg}` : true,
);

if (sliceArg && !changes.length) {
  console.error(`slice not found: ${sliceArg}`);
  process.exit(1);
}

let checked = 0;
const failures = [];

for (const change of changes) {
  const evidence = join(change.dir, 'evidence');
  if (!existsSync(evidence)) {
    console.log(`skip ${change.slice} (${change.location}): no evidence/`);
    continue;
  }
  const hasRed = existsSync(join(evidence, 'red-run.json'));
  const hasGreen = existsSync(join(evidence, 'green-run.json'));
  const hasAnyRun = hasRed || hasGreen;
  if (!hasAnyRun) {
    console.log(
      `skip ${change.slice} (${change.location}): evidence/ without run JSON`,
    );
    continue;
  }

  checked += 1;
  const rg = runNode('check-red-green-evidence.mjs', ['--slice', change.slice]);
  process.stdout.write(rg.stdout);
  process.stderr.write(rg.stderr);
  if (rg.status !== 0) {
    failures.push(`${change.slice}: red-green evidence failed`);
  }

  if (hasGreen) {
    const ho = runNode('check-handoff-fresh.mjs', ['--slice', change.slice]);
    process.stdout.write(ho.stdout);
    process.stderr.write(ho.stderr);
    if (ho.status !== 0) {
      failures.push(`${change.slice}: handoff freshness failed`);
    }
  }

  const ledger = join(evidence, 'remediation-ledger.md');
  if (existsSync(ledger)) {
    const led = runNode('check-remediation-ledger.mjs', [
      '--file',
      ledger,
    ]);
    process.stdout.write(led.stdout);
    process.stderr.write(led.stderr);
    if (led.status !== 0) {
      failures.push(`${change.slice}: remediation ledger failed`);
    }
  }
}

if (failures.length) {
  console.error(`slice gates failed (${failures.length}):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

console.log(
  checked === 0
    ? 'slice gates OK (no evidence-bearing slices yet)'
    : `slice gates OK (${checked} slice(s) checked)`,
);
