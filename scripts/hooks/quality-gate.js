#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function hasFlag(argv, flag) {
  return argv.includes(flag);
}

function readFlagValue(argv, flag) {
  const idx = argv.indexOf(flag);
  if (idx < 0) return null;
  const val = argv[idx + 1];
  if (!val || val.startsWith('--')) return null;
  return val;
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (typeof result.status === 'number') return result.status;
  return 1;
}

function resolveGradleCommand(repoRoot) {
  const unix = path.join(repoRoot, 'gradlew');
  const win = path.join(repoRoot, 'gradlew.bat');
  if (fs.existsSync(unix)) return unix;
  if (fs.existsSync(win)) return win;
  return null;
}

function main() {
  const argv = process.argv.slice(2);
  const repoRoot = process.cwd();

  const docsOnly = hasFlag(argv, '--docs-only');
  const noDocs = hasFlag(argv, '--no-docs');
  const noBackendLint = hasFlag(argv, '--no-backend-lint');
  const backendVerify = hasFlag(argv, '--backend-verify');
  const slice = readFlagValue(argv, '--slice');

  const gradlew = resolveGradleCommand(repoRoot);
  const canRunGradle =
    Boolean(gradlew) && fs.existsSync(path.join(repoRoot, 'build.gradle.kts'));

  const shouldRunDocs = !noDocs;
  const shouldRunBackendLint =
    !docsOnly && !noBackendLint && canRunGradle && !backendVerify;
  const shouldRunBackendVerify = backendVerify && canRunGradle;

  if (shouldRunDocs) {
    const docsCommands = [
      ['node', ['scripts/check-verification-manifest.mjs']],
      [
        'npx',
        [
          '--yes',
          '@redocly/cli@2.44.1',
          'lint',
          'openapi/*.yaml',
          '--extends=minimal',
        ],
      ],
      ['npx', ['--yes', '@fission-ai/openspec@1.7.0', 'validate', '--all', '--strict']],
      ['node', ['scripts/check-doc-links.mjs']],
      ['node', ['scripts/check-traceability.mjs', '--check-fresh']],
      ['node', ['scripts/check-golden-seed.mjs']],
    ];

    for (const [cmd, args] of docsCommands) {
      const ec = run(cmd, args);
      if (ec !== 0) process.exit(ec);
    }

    const sliceGatesArgs = ['scripts/check-slice-gates.mjs'];
    if (slice) sliceGatesArgs.push('--slice', slice);
    const sliceEc = run('node', sliceGatesArgs);
    if (sliceEc !== 0) process.exit(sliceEc);
  }

  if (!canRunGradle && (shouldRunBackendLint || shouldRunBackendVerify)) {
    process.stderr.write(
      'backend gates skipped: Gradle wrapper/build.gradle.kts not found\n',
    );
    process.exit(0);
  }

  if (shouldRunBackendLint) {
    const ec = run(gradlew, [
      'checkstyleMain',
      'checkstyleTest',
      'spotbugsMain',
      '--no-daemon',
    ]);
    if (ec !== 0) process.exit(ec);
  }

  if (shouldRunBackendVerify) {
    const ec = run(gradlew, [
      'checkstyleMain',
      'checkstyleTest',
      'spotbugsMain',
      'dependencyCheckAnalyze',
      'test',
      'jacocoTestCoverageVerification',
      'build',
      '--no-daemon',
    ]);
    if (ec !== 0) process.exit(ec);
  }
}

main();

