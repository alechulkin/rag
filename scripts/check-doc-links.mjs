#!/usr/bin/env node
// Verifies that every relative markdown link in the repo's .md files points
// at an existing file or directory. External (http/mailto) and pure-anchor
// links are skipped. Exits 1 listing broken links.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const ROOT = resolve(process.argv[2] ?? '.');
// Vendored agent/skill packages are third-party content — not checked.
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.gradle', 'build', 'dist',
  '.agents', '.cursor', '.codex', '.claude',
]);
const LINK_RE = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

function* mdFiles(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const path = join(dir, entry);
    const st = statSync(path);
    if (st.isDirectory()) yield* mdFiles(path);
    else if (entry.endsWith('.md')) yield path;
  }
}

const broken = [];
for (const file of mdFiles(ROOT)) {
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(LINK_RE)) {
    const link = match[1];
    if (/^(https?:|mailto:|#)/.test(link)) continue;
    const target = link.split('#')[0];
    if (!target) continue;
    if (!existsSync(resolve(dirname(file), decodeURIComponent(target)))) {
      broken.push(`${file}: ${link}`);
    }
  }
}

if (broken.length > 0) {
  console.error(`Broken relative links (${broken.length}):`);
  for (const b of broken) console.error(`  ${b}`);
  process.exit(1);
}
console.log('doc links OK');
