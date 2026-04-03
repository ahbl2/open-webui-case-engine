/**
 * P39-02 — Deterministic case-scoped Timeline list filtering (client-side only).
 * Spec: DetectiveCaseEngine docs P39-01 §6.
 */
import type { TimelineEntry } from '$lib/apis/caseEngine';

export interface TimelineListFilterCriteria {
	/** Raw search box text; trimmed + lowercased for matching */
	searchText: string;
	/** Inclusive lower bound, `YYYY-MM-DD` from `<input type="date">`, or empty */
	dateFrom: string;
	/** Inclusive upper bound, `YYYY-MM-DD`, or empty */
	dateTo: string;
	/** `'all'` or a concrete `timeline_entries.type` value */
	typeFilter: string;
}

/** Lowercase trimmed needle; empty means “no text constraint”. */
export function normalizeTimelineSearchNeedle(raw: string): string {
	return raw.trim().toLowerCase();
}

/** Calendar date in UTC for the instant, `YYYY-MM-DD` (for range compare). */
export function timelineEntryUtcDateString(occurredAtIso: string): string {
	const t = Date.parse(occurredAtIso);
	if (Number.isNaN(t)) return '';
	return new Date(t).toISOString().slice(0, 10);
}

/**
 * Inclusive date range on occurred_at (UTC calendar date).
 * Empty `dateFrom` / `dateTo` = no bound on that side.
 * If both set and `dateFrom > dateTo`, no entry matches the date constraint.
 */
export function occurredWithinInclusiveUtcDateRange(
	occurredAtIso: string,
	dateFrom: string,
	dateTo: string
): boolean {
	const d = timelineEntryUtcDateString(occurredAtIso);
	if (!d) return false;
	if (dateFrom && dateTo && dateFrom > dateTo) return false;
	if (dateFrom && d < dateFrom) return false;
	if (dateTo && d > dateTo) return false;
	return true;
}

function entryMatchesSearch(
	entry: TimelineEntry,
	needle: string,
	typeLabel: (type: string) => string
): boolean {
	if (!needle) return true;
	const t = entry.text_original.toLowerCase().includes(needle);
	if (t) return true;
	const loc = (entry.location_text ?? '').toLowerCase().includes(needle);
	if (loc) return true;
	const label = typeLabel(entry.type).toLowerCase();
	return label.includes(needle);
}

/**
 * Returns a new array of entries matching all criteria; order is preserved.
 * Does not mutate `entries`.
 */
export function filterTimelineEntries(
	entries: readonly TimelineEntry[],
	criteria: TimelineListFilterCriteria,
	typeLabel: (type: string) => string
): TimelineEntry[] {
	const needle = normalizeTimelineSearchNeedle(criteria.searchText);
	return entries.filter((e) => {
		if (criteria.typeFilter !== 'all' && e.type !== criteria.typeFilter) return false;
		if (
			!occurredWithinInclusiveUtcDateRange(e.occurred_at, criteria.dateFrom, criteria.dateTo)
		) {
			return false;
		}
		if (!entryMatchesSearch(e, needle, typeLabel)) return false;
		return true;
	});
}
