/**
 * P40-05G — Canonical timeline entry type values for create/edit and proposal review alignment.
 * Must stay consistent with `timeline_entries.type` and Timeline +page composer/edit.
 * Legacy rows may still store `note`; UI may offer it only when editing those rows.
 */
import { TIMELINE_TYPE_NOTE_DISPLAY_LABEL } from './timelineTypeNoteClarity';

export const TIMELINE_ENTRY_TYPE_VALUES = [
	'incident',
	'controlled_buy',
	'search_warrant',
	'surveillance',
	'interview',
	'evidence'
] as const;
export type TimelineEntryTypeValue = (typeof TIMELINE_ENTRY_TYPE_VALUES)[number];

const CANONICAL_LABELS: Record<TimelineEntryTypeValue, string> = {
	incident: 'Incident',
	controlled_buy: 'Controlled buy',
	search_warrant: 'Search warrant',
	surveillance: 'Surveillance',
	interview: 'Interview',
	evidence: 'Evidence'
};

export function isCanonicalTimelineEntryType(t: string): t is TimelineEntryTypeValue {
	return (TIMELINE_ENTRY_TYPE_VALUES as readonly string[]).includes(t);
}

/** Options for <select>: canonical types, plus legacy `note` when the persisted row is still `note`. */
export function timelineEntryTypeSelectOptions(persistedType?: string | null): string[] {
	const pt = String(persistedType ?? '').trim().toLowerCase();
	const base = [...(TIMELINE_ENTRY_TYPE_VALUES as readonly string[])];
	if (pt === 'note') return ['note', ...base];
	return base;
}

export function timelineEntryTypeOptionLabel(t: string): string {
	if (t === 'note') return TIMELINE_TYPE_NOTE_DISPLAY_LABEL;
	if (t === 'unspecified') return 'Unspecified';
	if (isCanonicalTimelineEntryType(t)) return CANONICAL_LABELS[t];
	if (!t.trim()) return '';
	return t
		.split(/[_\s-]+/)
		.filter(Boolean)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
		.join(' ');
}
