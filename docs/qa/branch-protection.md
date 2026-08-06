# Branch protection — human merge gate

Repo file cannot enable GitHub branch protection. Org/repo admin must set it.
Until set, NFR §7.1 non-author review is **process-only**.

## Required settings (main / master)

1. **Require a pull request before merging**
2. **Require approvals: ≥ 1**
3. **Dismiss stale approvals** when new commits are pushed
4. **Require review from Code Owners** (once `.github/CODEOWNERS` lists real owners)
5. **Do not allow bypass** for administrators on release branches (prefer)
6. **Require status checks to pass**: job `docs-verify` (add `backend-verify` /
   `frontend-verify` when enabled in foundation slice)
7. **Require conversation resolution** before merge

## CODEOWNERS

`.github/CODEOWNERS` ships with a placeholder owner. Replace `@OWNER` with the
real GitHub user or team before relying on “Require review from Code Owners”.

## Verification

- PR template checkbox: ≥ 1 non-author approver (`.github/pull_request_template.md`)
- CodeRabbit remains **advisory** (`.coderabbit.yaml`) — not a substitute for human approval
- Merge-ready = CI green **and** human approval recorded on the PR
