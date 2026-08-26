# During — `<slice>`

Phases B–D. This is the `/opsx-apply` implementation phase. Do not copy every
`tasks.md` row here; sequence PRs and gates. Never `[x]` without a proving
command.

1. Start: `/opsx-apply <slice>`.
2. Walk `openspec/changes/<slice>/tasks.md` in order. Per task: tests first,
   prove red, implement, prove green, then `[x]`.
3. Split PRs if review size grows. List the split below when filling this
   template.
4. After first failing matrix-row tests, write
   `openspec/changes/<slice>/evidence/red-run.json` (non-zero `exitCode`,
   non-empty `failingTests`, `gitHead`, ISO `timestamp`).
5. After green: `green-run.json` (`exitCode` 0, empty `failingTests`,
   **different** `gitHead`, **later** timestamp). Then:

```bash
node scripts/check-red-green-evidence.mjs --slice <slice>
```

6. Local battery before PR:

```bash
node scripts/check-verification-manifest.mjs
npx --yes @redocly/cli@2.44.1 lint openapi/*.yaml --extends=minimal
npx --yes @fission-ai/openspec@1.7.0 validate --all --strict
node scripts/check-doc-links.mjs
node scripts/check-traceability.mjs --check-fresh
node scripts/check-golden-seed.mjs
node scripts/check-slice-gates.mjs --slice <slice>
```

7. After Gradle exists, also:

```bash
./gradlew checkstyleMain checkstyleTest spotbugsMain dependencyCheckAnalyze test jacocoTestCoverageVerification build
```

8. After `frontend/` exists, also:

```bash
cd frontend && npm run lint && npx tsc --noEmit && npm run test:coverage && npm run build
```

9. After `@trace` tags exist:

```bash
node scripts/check-traceability.mjs --phase full --write
node scripts/check-traceability.mjs --phase full --check-fresh
```

Same freshness rule: unsliced `--write` only (matches CI).

10. Fill slice-specific extra work from
    `docs/qa/slice-implementation-runbook.md` Phase G.
