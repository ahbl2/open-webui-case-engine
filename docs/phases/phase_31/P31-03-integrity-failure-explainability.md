# P31-03 — Integrity failure explainability (Notes) — OWUI

**Status:** Complete  

This ticket spans **Case Engine** (stable `AI_VALIDATION_FAILED` / `details.reasons` contract) and **this repo** (Notes UI copy + parsing).

**Canonical closure doc** (overview, API contract, verification, full file list):  
[sibling checkout] `DetectiveCaseEngine/docs/phases/phase_31/P31-03-integrity-failure-explainability.md`

**OWUI implementation touchpoints:** `src/lib/caseNotes/noteIntegrityExplain.ts`, `src/lib/caseNotes/noteIntegrityExplain.test.ts`, `src/routes/(app)/case/[id]/notes/+page.svelte`, `src/lib/apis/caseEngine/__tests__/p31_02_notebookNoteErrors.test.ts`, `package.json` (`test:p20-pre`).

**Suggested commit message:** `feat(owui): add note integrity failure explainability for enhance and save blocks (P31-03)`
