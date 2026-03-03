# Repo Safety: DetectiveCaseEngine vs OpenWebUI-CaseEngine

Two sibling repos should stay separate. Use these safeguards to avoid committing the wrong files.

## Workflow

1. **Open one repo per Cursor window** – Do not open both repos in the same workspace.
2. **Run `scripts/precommit-check.ps1` before committing** – Verifies repo context.
3. **If commit is blocked** – Unstage the offending files and commit in the correct repo.
4. **Emergency bypass** – `git commit --no-verify` (use only when necessary).

## What’s in place

- `.repo-identity` – Marks this repo.
- `scripts/precommit-check.ps1` – Pre-commit info script.
- `.githooks/pre-commit` – Cross-repo guard (blocks mismatched files).
- `git config core.hooksPath .githooks` – Uses the custom hooks.

## Enable hooks

```powershell
git config core.hooksPath .githooks
```

## Bypass (emergency)

```powershell
git commit --no-verify
```

Use sparingly and only when you’re sure the commit is correct.
