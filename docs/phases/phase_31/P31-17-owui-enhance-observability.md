# P31-17 — OWUI Enhance observability (session-local)

**Status:** COMPLETE (2026-03-28)  
**Repo:** open-webui-case-engine (UI layer only)

---

## 1. Overview

Adds **ephemeral, in-memory** observability for the Notes **Enhance** workflow: pre-save client validation outcomes, safe-mode fallback sequencing, apply/dismiss, and **save blocked by commit integrity** (`AI_VALIDATION_FAILED`). Complements Case Engine **P31-04** (commit-time persistence only) without making OWUI a source of truth for case data.

**Parity:** Internal validator keys and the order of checks in `tryEnhancePass` mirror Case Engine `validateEnhancedText` (see **DetectiveCaseEngine** `docs/phases/phase_31/P31-06-integrity-calibration-review.md` §2). Reason copy stays aligned with `noteIntegrityExplain.ts` ↔ CE `noteIntegrityReasonContract.ts` (cross-checked under **P31-21** — `docs/phases/phase_31/P31-21-documentation-consistency-audit.md`).

---

## 2. Why P31-04 is not enough for Enhance

- **P31-04** records **notebook commit** integrity outcomes in SQLite (`notebook_integrity_events`). It does **not** see Enhance-only failures (rejected proposals), strict→safe fallback success, or “user dismissed suggestion” — all of which happen **only in the browser** before save.
- Operators debugging “Enhance feels flaky” need the **UI-layer** story: which pass failed, which reason codes surfaced, whether safe fallback ran, and whether the investigator applied or discarded the proposal.

---

## 3. Enhance states instrumented

| Transition | Event type | Notes |
|------------|------------|--------|
| Empty draft / no model | `enhance_precondition_failed` | `skipped_precondition` + synthetic codes `empty_draft` / `no_model_available` |
| After preflight OK | `enhance_requested` | `pipeline_started`; metadata: draft length, block count, baseline flag, `modelId` |
| Strict pass / fail / fatal | `enhance_validation_outcome` | `validationMode: 'strict'` |
| After strict validation rejection | `enhance_fallback_attempted` | Before second `tryEnhancePass(..., true)` |
| Safe pass / fail / fatal | `enhance_validation_outcome` | `validationMode: 'safe'` |
| Uncaught enhance error | `enhance_validation_outcome` | `outcome: 'error'`, code `client_enhance_exception` |
| User clicks Apply | `enhance_applied` | Correlation id matches the enhance session |
| User clicks Dismiss (proposal) | `enhance_dismissed` | Same |
| Save/create returns `AI_VALIDATION_FAILED` | `save_integrity_blocked` | CE `requestId` + parsed reason **codes** only |

**Not instrumented (by design):** per-check stepping inside `tryEnhancePass` (would duplicate CE logic and risk drift); attachment/dictation flows.

---

## 4. Event shape

Defined in `src/lib/caseNotes/enhanceObservability.ts`:

- `timestamp`, `caseId`, `noteContext` (`create` | `edit` + `noteId`), `correlationId` (UUID per `handleEnhance` attempt)
- `eventType`, `validationMode` (`strict` \| `safe` \| null), `outcome`
- `reasonCodes` — stable contract codes or small synthetic precondition codes only
- `requestId` — optional, from `CaseEngineRequestError` on save failure
- `metadata` — counts and flags only (`draftCharCount`, `paragraphBlockCount`, `integrityBaselinePresent`, `modelId`, `modelTruncated`, `enhanceFallbackUsed`)

---

## 5. Storage / inspection

- **In-memory ring buffer** (max 120 events per tab); **no localStorage**, no server writes.
- **Case switch** clears the buffer (`clearEnhanceObservabilityEvents` from the route reactive block).
- **`import.meta.env.DEV`:** floating **Enhance trace (dev)** panel (`data-testid="enhance-observability-panel"`) lists safe fields + Clear button.
- **`console.debug('[enhance:observability]', …)`** in DEV only (suppressed when `import.meta.env.MODE === 'test'` so Vitest stays quiet).

---

## 6. Privacy / non-capture guarantees

- **Never** stored or logged: note body, enhanced proposal text, titles, attachment content, investigator PII.
- **Captured:** case id, optional note id (for edit context), model id string, numeric counts, boolean flags, integrity reason **codes** (not investigator-facing bullet text in the event payload).
- OWUI remains a **UI shell**: events are diagnostic only and are **not** authoritative for case state; Case Engine + API remain source of truth.

---

## 7. Files modified

- `src/lib/caseNotes/enhanceObservability.ts` — event types, buffer, tick store, helpers
- `src/lib/caseNotes/enhanceObservability.test.ts` — unit tests
- `src/routes/(app)/case/[id]/notes/+page.svelte` — instrumentation + dev panel

---

## 8. Tests

- `npx vitest run src/lib/caseNotes/enhanceObservability.test.ts`

---

## 9. Verification

1. `npm run dev` (or stack per `docs/STACK_STARTUP.md`); open Notes on a case in **dev** build.
2. Run Enhance (strict pass, strict fail → safe pass, full reject); expand **Enhance trace (dev)** — confirm event order and codes.
3. Apply / dismiss — confirm `enhance_applied` / `enhance_dismissed`.
4. (Optional) Trigger save-time `AI_VALIDATION_FAILED` — confirm `save_integrity_blocked` with CE `requestId` if returned.
5. Navigate to another case — trace buffer clears.

---

## 10. Status

**COMPLETE.**

**Suggested commit message:** `feat(owui): add session-scoped enhance observability for notebook integrity flow (P31-17)`

**Cross-repo:** Detective Case Engine `docs/phases/phase_31/PHASE_31_TASK_TRACKER.md`, `PHASE_31_ROADMAP.md`, and `P31-04-persistent-integrity-observability.md` reference this closure doc (sibling checkout `DetectiveCaseEngine`).
