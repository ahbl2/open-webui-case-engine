/**
 * P38-06 — Pure helpers for “unsaved timeline create/edit” detection (beforeNavigate guard).
 * Mirrors Timeline +page field semantics; safe to unit-test without Svelte.
 * P40-05G — `isoToDatetimeLocal` lives in `$lib/caseTimeline/timelineOccurredAtLocal` (real local TZ).
 */
import type { TimelineEntry } from '$lib/apis/caseEngine';
import { isoToDatetimeLocal } from '$lib/caseTimeline/timelineOccurredAtLocal';

export { isoToDatetimeLocal };

export interface TimelineCreateDraftForDirty {
	text_original: string;
}

export interface TimelineEditDraftForDirty {
	text_original: string;
	type: string;
	occurred_at: string;
	location_text: string;
	change_reason: string;
	/** Pending image attachments (case file ids + names); compared to entry.linked_image_files for dirty. */
	linked_images: Array<{ id: string; original_filename: string }>;
}

/** Same algorithm as inline create `isDirtyCreate()` — any non-empty entry text. */
export function isDirtyTimelineCreate(draft: TimelineCreateDraftForDirty | null): boolean {
	return !!draft && draft.text_original.trim() !== '';
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
	/** Images uploaded as case files, pending link on explicit save */
	linked_images: Array<{ id: string; original_filename: string }>;
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
		draft.location_text.trim() !== '' ||
		draft.linked_images.length > 0
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
	const persistedImageIds = (entry.linked_image_files ?? []).map((f) => f.id);
	const draftImageIds = editDraft.linked_images.map((f) => f.id);
	const imagesDirty = JSON.stringify(persistedImageIds) !== JSON.stringify(draftImageIds);
	return (
		editDraft.text_original.trim() !== (entry.text_original ?? '').trim() ||
		editDraft.type !== entry.type ||
		editDraft.occurred_at !== isoToDatetimeLocal(entry.occurred_at) ||
		(editDraft.location_text.trim() || '') !== (entry.location_text ?? '').trim() ||
		editDraft.change_reason.trim() !== '' ||
		imagesDirty
	);
}
