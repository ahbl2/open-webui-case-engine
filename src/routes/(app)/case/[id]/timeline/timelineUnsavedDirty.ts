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
