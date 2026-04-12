/**
 * P95-01 — Timeline entry body preview: fixed collapsed line count, CSS `line-clamp` only (no text mutation).
 * The Tailwind class string must also appear literally in `TimelineEntryCard.svelte` so the utility is generated.
 * Task row truncation patterns (Phase 94) are a similar UX; no shared runtime coupling.
 */
export const TIMELINE_ENTRY_BODY_COLLAPSED_MAX_LINES = 5 as const;

/** Matches `line-clamp-*` in the card template and overflow measure — keep in sync. */
export const TIMELINE_ENTRY_BODY_LINE_CLAMP_TAILWIND = 'line-clamp-5' as const;
