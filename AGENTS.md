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