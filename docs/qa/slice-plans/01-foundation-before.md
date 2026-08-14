# Before — `foundation-slice`

Phase A only. No `/opsx-apply`. No Gradle. Stop on non-zero exit.

1. Create branch: `git checkout -b feat/foundation-slice`.
2. Skip `/opsx-propose`. OpenSpec already at
   `openspec/changes/foundation-slice/`.
3. Write `docs/specs/01_Foundation_Spec.md` (OpenSpec tasks 1.1–1.4):
   1. Synthesize proposal, design, and delta specs with file-path layout:
      entities → migrations → stubs → endpoints → tests.
   2. Document canary resolution **(a)**: FK chain `collections` →
      `documents` → `document_versions` → `embedding_profiles` → `chunks` →
      `chunk_embeddings` plus `access_policies` deny rows.
   3. Document already-applied schema edits: `tenants.jit_email_domains`;
      §9.1/§9.2 canary table split; SAD `worker.pipeline`/`worker.eval` →
      `documents.pipeline`/`evaluation`.
   4. Cross-check Database_Schema §9.1/§9.2, Module_Boundaries §2/§9, SAD
      §8 track 1, `openapi/admin.yaml`. Report leftover conflicts.
4. Run:

```bash
npx --yes @fission-ai/openspec@1.7.0 validate --all --strict
node scripts/check-traceability.mjs --slice foundation-slice --phase docs --write
node scripts/check-traceability.mjs --check-fresh
node scripts/check-doc-links.mjs
npx --yes @redocly/cli@2.44.1 lint openapi/*.yaml --extends=minimal
node scripts/check-verification-manifest.mjs
node scripts/check-golden-seed.mjs
```

5. Commit `docs/specs/01_Foundation_Spec.md` and
   `docs/qa/traceability-report.md`.
6. If any command is red: stop. Do not start During.
