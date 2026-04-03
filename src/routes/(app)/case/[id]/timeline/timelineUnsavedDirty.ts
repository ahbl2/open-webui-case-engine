/**
 * P38-06 — Pure helpers for “unsaved timeline create/edit” detection (beforeNavigate guard).
 * Mirrors Timeline +page field semantics; safe to unit-test without Svelte.
 */
import type { TimelineEntry } from '$lib/apis/caseEngine';

export interface TimelineCreateDraftForDirty {
	text_original: string;
}

export interface TimelineEditDraftForDirty {
	text_original: string;
	type: string;
	occurred_at: string;
	location_text: string;
	change_reason: string;
}

/** Same algorithm as inline create `isDirtyCreate()` — any non-empty entry text. */
export function isDirtyTimelineCreate(draft: TimelineCreateDraftForDirty | null): boolean {
	return !!draft && draft.text_original.trim() !== '';
}

/**
 * Convert ISO `occurred_at` to datetime-local slice for comparison with edit draft.
 * Must stay aligned with `+page.svelte` save path expectations.
 */
export function isoToDatetimeLocal(iso: string): string {
	const match = iso.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?)/);
	if (!match) return iso.slice(0, 19).replace(' ', 'T');
	const base = match[1];
	return base.length === 16 ? `${base}:00` : base.slice(0, 19);
}

// ── P39-03 — Bottom composer state helpers ─────────────────────────────────

export interface BottomComposerDraft {
	/** YYYY-MM-DD from <input type="date"> — required before save */
	occurred_date: string;
	/** HH:MM or HH:MM:SS from <input type="time"> — required before save */
	occurred_time: string;
	type: string;
	text_original: string;
	location_text: string;
}

/**
 * Dirty when any meaningful field was touched.
 * Type changes alone are not tracked since the field always has a value.
 */
export function isDirtyBottomComposer(draft: BottomComposerDraft | null): boolean {
	if (!draft) return false;
	return (
		draft.text_original.trim() !== '' ||
		draft.occurred_date !== '' ||
		draft.occurred_time !== '' ||
		draft.location_text.trim() !== ''
	);
}

/**
 * Save is valid only when date, time, and entry text are all present.
 */
export function isBottomComposerSaveValid(draft: BottomComposerDraft | null): boolean {
	if (!draft) return false;
	return (
		draft.occurred_date.trim() !== '' &&
		draft.occurred_time.trim() !== '' &&
		draft.text_original.trim() !== ''
	);
}

/** True when edit draft differs from the persisted row or the operator started a change reason. */
export function isDirtyTimelineEdit(
	editingEntryId: string | null,
	editDraft: TimelineEditDraftForDirty | null,
	entries: readonly TimelineEntry[]
): boolean {
	if (!editingEntryId || !editDraft) return false;
	const entry = entries.find((e) => e.id === editingEntryId);
	if (!entry) return false;
	return (
		editDraft.text_original.trim() !== (entry.text_original ?? '').trim() ||
		editDraft.type !== entry.type ||
		editDraft.occurred_at !== isoToDatetimeLocal(entry.occurred_at) ||
		(editDraft.location_text.trim() || '') !== (entry.location_text ?? '').trim() ||
		editDraft.change_reason.trim() !== ''
	);
}
