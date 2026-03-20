# AGENTS.md

## Project
This repository is the Open WebUI integration layer for Detective Case Engine.
It provides UI behavior, case navigation, scoped chat behavior, and case-aware frontend integrations.

## Architecture rules
1. This repo is a UI layer only.
2. This repo must not become the source of truth for case data.
3. Case data ownership stays in DetectiveCaseEngine.
4. Do not add persistent case-data business logic here unless explicitly required and approved.
5. Keep integrations explicit and easy to trace.

## Scope rules
1. Implement only the current ticket.
2. Do not redesign the architecture unless the ticket explicitly requires it.
3. Do not add dependencies unless necessary.
4. Prefer narrow UI changes over broad refactors.
5. Preserve case scoping and user context behavior.

## Security and integrity rules
1. Never bypass the Case Engine API for case ownership logic.
2. Do not duplicate or invent case-data authority in the UI.
3. Preserve active case scoping.
4. Avoid stale state bugs and cross-case context leakage.
5. Prefer explicit state transitions and guarded async updates.

## Chat scope stores (shared `Chat` component)
**Persisted scope is cache, not authority.** `scope`, `activeCaseId`, and related Case Engine stores live in `localStorage`; **bound thread scope** (`activeThreadScope` + backend association for the opened thread) controls how chat submit must behave.

- **On personal/desktop thread open:** reconcile to desktop — e.g. `scope` → `ALL`, clear case-only stores (`activeCaseId`, `activeCaseNumber`, `caseContext`, `aiCaseContext`); do not leave `THIS_CASE` steering submit on a personal thread.
- **On case thread open:** reconcile to case — e.g. `scope` → `THIS_CASE` with `activeCaseId` for that case workspace.
- **Navigation/open must reconcile** cached client state to the current binding; never assume the URL alone fixes persisted stores.

Implementation touchpoints include `routes/(app)/home/+page.svelte` (personal bind), `routes/(app)/case/[id]/chat/+page.svelte` (case bind), `routes/(app)/c/[id]/+page.svelte` (`boundScope` sync), and `Chat.svelte` `submitPrompt` (keys off `scope`).

## Shared Chat component routing rules (Case Engine AI)

The same `Chat.svelte` mounts on:

- **`/case/:id/chat`** — case workspace thread hub  
- **`/c/:threadId`** — standalone OWUI chat thread (includes My Desktop → `/c/...` after bind)

**`submitPrompt` order (do not reorder casually):**

1. **`scope === 'THIS_CASE'`** → **`askCase`** → Case Engine **`POST /cases/:id/ask`** (requires `activeCaseId` + token). Single-case retrieval only.
2. Else if the URL path matches **standalone `/c/:threadId`** only, **`scope !== 'THIS_CASE'`**, **Case Engine token** is present, and the prompt meets the **ask-cross** minimum length → **`askCrossCase`** → **`POST /cases/ask-cross`**. Unit scope for the request comes from navbar `scope` (`ALL` / `CID` / `SIU`).
3. Else → normal Open WebUI completion (WebSocket / model).

**Guardrails:**

- With a Case Engine token on **`/c/...`**, do **not** silently rely on generic OWUI completion for eligible prompts — cross-case routing must stay wired.
- Cross-case retrieval must remain **server-authorized** only; the UI only supplies `unitScope` where the backend allows (non–ADMIN roles are constrained in Case Engine).

## Intake and official records (P19) — non-negotiables

These rules prevent architectural drift in the OWUI fork. The companion Case Engine repo documents the same alignment in its root `AGENTS.md`.

- **`proposal_records`** are the **only governed proposal workflow** this UI should use for intake that may become **official timeline** or **governed notebook** data. **Reuse** the existing P19 proposal lifecycle and endpoints before introducing any new intake abstraction or duplicate “proposal” concept.
- **Chat** is the **primary intake entry** (natural-language drafts via governed Case Engine endpoints). Chat-originated **official-record suggestions** must **always** become **`proposal_records` first** — never write directly to **`timeline_entries`** or **`notebook_notes`** from chat.
- **Chat must never** call APIs that insert or update **`timeline_entries`** / **`notebook_notes`** as if they were chat side-effects. The path is: **proposal** → human review → **`commit`** (or other explicitly governed backend action).
- **`Timeline`** tab = **`timeline_entries`** = **official committed** case record (what appears after **approve + commit** on a timeline proposal, or other audited writes — not chat).
- **`Notes`** tab = **`notebook_notes`** = **investigator working drafts only** — not the official timeline, **not** interchangeable with Timeline.
- **`Proposals`** tab = **`proposal_records`** = **staging/review layer** for timeline- and note-type proposals; it lists the **same underlying rows** as chat intake / `listProposals` — **not** a second proposal system.
- **Implementation:** use `listProposals` / `approveProposal` / `rejectProposal` / `commitProposal` / `updateProposal` / `draftChatIntakeProposal` / `reviseChatIntakeProposal` as appropriate; do **not** route this primary story through Phase 7 **`/cases/:id/intake/*`** or legacy **`/intakes/*`** unless an explicit ticket requires legacy integration.

Reference docs (Case Engine repo): `docs/architecture/CURRENT_SYSTEM_STATE.md` (P19 Proposal System / Intake Architecture), `docs/workflows/CANONICAL_INTAKE_WORKFLOW.md` (OWUI vs backend history).

## Review priorities
When reviewing changes, look specifically for:
- stale response overwrites
- cross-case context leakage
- UI assuming ownership of case data
- unsafe client-side assumptions
- missing error handling
- missing loading/empty/error states
- regression in case sidebar or case context handling

## Expected output from Codex
When implementing or reviewing, return:
1. files changed
2. summary of behavior change
3. risks found
4. tests added or still needed
5. whether the UI remains properly scoped to Case Engine as the source of truth