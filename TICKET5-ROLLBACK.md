# Ticket 5 Rollback Guide

## Summary

This document describes how to revert the Ticket 5 (Phase 3) integration: Cases Sidebar, Case-Scoped Chat, and Citations.

## Files Changed

| File | Change |
|------|--------|
| `src/lib/constants.ts` | Added `CASE_ENGINE_BASE_URL` |
| `src/lib/apis/caseEngine/index.ts` | **New file** – Case Engine API client |
| `src/lib/stores/caseEngine.ts` | **New file** – Case Engine state stores |
| `src/lib/stores/index.ts` | Re-export case engine stores |
| `src/lib/components/layout/Sidebar.svelte` | Added CasesSection import and component |
| `src/lib/components/layout/Sidebar/CasesSection.svelte` | **New file** – Cases section with unit filter, search, case list |
| `src/lib/components/layout/Sidebar/ConnectCaseEngineModal.svelte` | **New file** – Connect to Case Engine login modal |
| `src/lib/components/chat/Navbar.svelte` | Added scope selector and active case badge |
| `src/lib/components/chat/Chat.svelte` | Added Case Engine routing in `submitPrompt` |
| `src/lib/components/chat/Messages/ResponseMessage.svelte` | Added `caseEngineCitations` type and Sources chips rendering |

## How to Revert

### Option 1: Git revert (if committed)

```bash
git revert <commit-hash>
```

### Option 2: Manual removal

1. Remove Case Engine routing block from `Chat.svelte` (search for `// Case Engine routing (Ticket 5)`).
2. Remove scope selector and active case badge from `Navbar.svelte`.
3. Remove Case Engine citations block from `ResponseMessage.svelte`.
4. Remove `<CasesSection />` and its import from `Sidebar.svelte`.
5. Delete `Sidebar/CasesSection.svelte`, `Sidebar/ConnectCaseEngineModal.svelte`.
6. Delete `apis/caseEngine/index.ts`, `stores/caseEngine.ts`.
7. Remove case engine store exports from `stores/index.ts`.
8. Remove `CASE_ENGINE_BASE_URL` from `constants.ts`.

## Confirmation

- **Case Engine (DetectiveCaseEngine)**: No changes. Case Engine codebase is unchanged.
- **New dependencies**: None added.
