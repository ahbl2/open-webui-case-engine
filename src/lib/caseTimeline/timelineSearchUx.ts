/**
 * P39-02A — Timeline search/filter UX helpers (date hint, highlight, large-list hint).
 * Filtering logic stays in timelineListFilter.ts; this file is display + guardrails only.
 */

/** When exceeded, show a non-blocking performance hint in the filter bar. */
export const LARGE_TIMELINE_FILTER_ENTRY_HINT_THRESHOLD = 500;

/** Both dates set and from > to (string compare works for YYYY-MM-DD). */
export function isTimelineFilterDateRangeInverted(dateFrom: string, dateTo: string): boolean {
	const a = dateFrom?.trim() ?? '';
	const b = dateTo?.trim() ?? '';
	return a.length > 0 && b.length > 0 && a > b;
}

export function shouldShowLargeTimelineFilterHint(entryCount: number): boolean {
	return entryCount > LARGE_TIMELINE_FILTER_ENTRY_HINT_THRESHOLD;
}

export type SearchHighlightSegment = { text: string; highlight: boolean };

/**
 * Split haystack into segments for case-insensitive substring highlight.
 * `normalizedNeedle` must already be trim + lowercase (use normalizeTimelineSearchNeedle).
 * Does not mutate haystack.
 */
export function splitTextForSearchHighlight(
	haystack: string,
	normalizedNeedle: string
): SearchHighlightSegment[] {
	if (!normalizedNeedle) {
		return haystack.length === 0 ? [] : [{ text: haystack, highlight: false }];
	}
	const n = normalizedNeedle.length;
	const result: SearchHighlightSegment[] = [];
	let i = 0;
	while (i < haystack.length) {
		const slice = haystack.slice(i);
		const idx = slice.toLowerCase().indexOf(normalizedNeedle);
		if (idx === -1) {
			result.push({ text: haystack.slice(i), highlight: false });
			break;
		}
		const matchStart = i + idx;
		if (matchStart > i) {
			result.push({ text: haystack.slice(i, matchStart), highlight: false });
		}
		result.push({ text: haystack.slice(matchStart, matchStart + n), highlight: true });
		i = matchStart + n;
	}
	return result;
}
