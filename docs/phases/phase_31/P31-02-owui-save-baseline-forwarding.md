# P31-02 — OWUI Save Baseline Forwarding (Commit Integrity)

**Status:** Completed  
**Repo:** open-webui-case-engine (Detective fork)

---

## 1. Overview

**Implemented:** The Case Notes workspace forwards **`integrity_baseline_text`** on `createCaseNotebookNote` and `updateCaseNotebookNote` when the investigator has applied a successful **Enhance** result and the current draft body (trimmed) still differs from the captured pre-enhance text. The Case Engine P31-01 commit guard can then run server-side validation on the production save path.

**Why P31-01 alone was insufficient:** The engine only validates when the client supplies a baseline. Without OWUI forwarding that field, typical UI saves never triggered enforcement.

---

## 2. Files Modified

| File | Purpose |
|------|---------|
| `src/lib/caseNotes/notebookIntegrityPayload.ts` | **New.** Pure helper `mergeNotebookWritePayload` — adds `integrity_baseline_text` only when baseline is non-empty and differs from trimmed outgoing `text`. |
| `src/lib/caseNotes/notebookIntegrityPayload.test.ts` | **New.** Unit tests for merge behavior (omit / include / equality). |
| `src/lib/apis/caseEngine/index.ts` | Notebook create/update accept optional `integrity_baseline_text`; failures throw `CaseEngineRequestError` with `errorCode`, `details`, and `requestId` (aligned with envelope parsing). Added `extractApiErrorDetails`. |
| `src/lib/apis/caseEngine/__tests__/p31_02_notebookNoteErrors.test.ts` | **New.** Verifies 400 + `AI_VALIDATION_FAILED` maps to typed errors. |
| `src/routes/(app)/case/[id]/notes/+page.svelte` | Draft state for baseline + pending baseline around Enhance; save payloads use merge helper; `AI_VALIDATION_FAILED` shows inline message without clearing draft. |
| `package.json` | `test:p20-pre` includes new tests. |

**Tracker (Case Engine repo):** `DetectiveCaseEngine/docs/phases/phase_31/PHASE_31_TASK_TRACKER.md` — P31-01-CE note clarified; P31-02-OWUI row added.

---

## 3. Draft State Changes

- **`integrityBaselineText`:** Set when the user **Apply**s an Enhance proposal, from the draft text that was sent into `tryEnhancePass` for that successful cycle (standard or safe pass).
- **`pendingIntegrityBaseline`:** Set when a pass returns `assembled`, cleared on dismiss/reset; copied into `integrityBaselineText` on Apply.
- Cleared by **`resetNoteIntegrityDraftState`:** case switch, note select, new note, duplicate-to-draft, start edit, cancel create/edit, successful save, and after successful create.
- **`resetEnhanceState`** clears **`pendingIntegrityBaseline`** only (proposal dismissed / reset).

---

## 4. Save Payload Changes

`mergeNotebookWritePayload` includes **`integrity_baseline_text`** only if:

- `integrityBaselineText` is non-empty after trim, and  
- trimmed baseline ≠ trimmed outgoing `text`.

Otherwise the field is **omitted** (manual notes, OCR-only drafts, or draft reverted to exact baseline).

---

## 5. Error Handling

On **`CaseEngineRequestError`** with **`httpStatus === 400`** and **`errorCode === 'AI_VALIDATION_FAILED`**:

- **No** toast-only swallow: a scoped **inline red banner** shows the server `error.message` (or a short fallback).
- Draft text and **`integrityBaselineText`** are **not** cleared; **`expected_updated_at`** is unchanged (409 conflict handling unchanged).
- **No** auto-retry or auto-revert.

---

## 6. Edge Cases

| Scenario | Behavior |
|----------|----------|
| Manual note | No baseline; field omitted. |
| OCR / attachment insert without Enhance | No baseline unless Enhance applied afterward. |
| Enhance rejected / error | `pendingIntegrityBaseline` not set for that attempt. |
| Multiple enhances before save | Each successful pass sets `pending` from **current** draft before that pass; Apply overwrites `integrityBaselineText`. |
| Edit after enhance | Baseline kept; still forwarded if still differs from trimmed save text. |
| Draft text trimmed equals baseline | Reactive clear of `integrityBaselineText` → field omitted on save. |

---

## 7. Verification

- **Automated:** `npm run test:p20-pre` (includes `notebookIntegrityPayload.test.ts`, `p31_02_notebookNoteErrors.test.ts`).
- **Manual:** Enhance a note → Apply → Save (network tab shows `integrity_baseline_text`); revert body to pre-enhance text → Save without field; force CE validation failure → inline message, draft preserved.

---

## 8. Status

Production Notes save path **activates** the Case Engine P31-01 commit integrity guard when Enhance has been applied and the draft still differs from the captured baseline. No validation logic duplicated in OWUI; no schema or backend contract changes beyond consuming the existing API.
