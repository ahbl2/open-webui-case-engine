/**
 * P40-05G — Canonical timeline entry type values for create/edit and proposal review alignment.
 * Must stay consistent with `timeline_entries.type` and Timeline +page composer/edit.
 */
import { TIMELINE_TYPE_NOTE_DISPLAY_LABEL } from './timelineTypeNoteClarity';

export const TIMELINE_ENTRY_TYPE_VALUES = ['note', 'surveillance', 'interview', 'evidence'] as const;
export type TimelineEntryTypeValue = (typeof TIMELINE_ENTRY_TYPE_VALUES)[number];

export function isCanonicalTimelineEntryType(t: string): t is TimelineEntryTypeValue {
	return (TIMELINE_ENTRY_TYPE_VALUES as readonly string[]).includes(t);
}

export function timelineEntryTypeOptionLabel(t: string): string {
	if (t === 'note') return TIMELINE_TYPE_NOTE_DISPLAY_LABEL;
	if (isCanonicalTimelineEntryType(t)) {
		return `${t.charAt(0).toUpperCase()}${t.slice(1)}`;
	}
	return t ? `${t.charAt(0).toUpperCase()}${t.slice(1)}` : '';
}
