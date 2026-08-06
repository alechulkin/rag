#!/usr/bin/env node
/**
 * Block `git commit` / `git push` when `--no-verify` / `-n` is a real flag.
 * Flag-position aware: skips values of -m/-F/-C/-c/-t and quoted commit bodies.
 *
 * Export `run(input)` for Cursor wrapper; CLI entry uses stdin.
 */
'use strict';

const SKIP_VALUE_FLAGS = new Set([
  '-m',
  '-F',
  '-C',
  '-c',
  '-t',
  '--message',
  '--file',
  '--reuse-message',
  '--reedit-message',
  '--template',
  '--author',
  '--date',
  '--cleanup',
]);

function tokenize(command) {
  const tokens = [];
  let cur = '';
  let quote = null;
  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (cur) {
        tokens.push(cur);
        cur = '';
      }
      continue;
    }
    cur += ch;
  }
  if (cur) tokens.push(cur);
  return tokens;
}

function isGitCommitOrPush(tokens) {
  const gitIdx = tokens.findIndex((t) => t === 'git' || t.endsWith('/git'));
  if (gitIdx < 0) return false;
  const sub = tokens[gitIdx + 1];
  return sub === 'commit' || sub === 'push';
}

function hasNoVerifyFlag(tokens) {
  let skipNext = false;
  for (const tok of tokens) {
    if (skipNext) {
      skipNext = false;
      continue;
    }
    if (SKIP_VALUE_FLAGS.has(tok)) {
      skipNext = true;
      continue;
    }
    if (tok === '--no-verify' || tok === '-n') return true;
    if (tok.startsWith('--') && tok.includes('=')) {
      const name = tok.slice(0, tok.indexOf('='));
      if (name === '--no-verify') return true;
    }
    // clustered short flags: -an, -n, etc. (not -m "..." values)
    if (/^-[a-zA-Z]+$/.test(tok) && tok.includes('n') && tok !== '-n') {
      // -n alone already handled; -an means all + no-verify
      if ([...tok.slice(1)].includes('n')) return true;
    }
  }
  return false;
}

function extractCommand(input) {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed) return '';
  try {
    const parsed = JSON.parse(trimmed);
    return String(
      parsed?.tool_input?.command ||
        parsed?.command ||
        parsed?.args?.command ||
        '',
    );
  } catch {
    return trimmed;
  }
}

function run(input) {
  const command = extractCommand(input);
  if (!command) return { exitCode: 0 };
  const tokens = tokenize(command);
  if (!isGitCommitOrPush(tokens)) return { exitCode: 0 };
  if (!hasNoVerifyFlag(tokens)) return { exitCode: 0 };
  return {
    exitCode: 2,
    stderr:
      'blocked: git commit/push with --no-verify/-n is forbidden (hooks must run)',
  };
}

module.exports = { run, tokenize, hasNoVerifyFlag, isGitCommitOrPush };

if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (c) => {
    raw += c;
  });
  process.stdin.on('end', () => {
    const result = run(raw || process.argv.slice(2).join(' '));
    if (result.stderr) process.stderr.write(result.stderr + '\n');
    process.exit(result.exitCode || 0);
  });
}
