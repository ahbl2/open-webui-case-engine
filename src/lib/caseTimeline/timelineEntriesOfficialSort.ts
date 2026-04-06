/**
 * P41-44-FU2 — Client-side ordering aligned with Case Engine list:
 * `ORDER BY occurred_at ASC, id ASC` on `timeline_entries`.
 *
 * Used after inline edit when `occurred_at` changes so the visible list matches
 * server chronology without a full reload.
 */
export type TimelineEntrySortable = {
	id: string;
	occurred_at?: string | null;
};

function occurredAtSortMs(iso: string | null | undefined): number {
	if (iso == null || iso === '') return Number.POSITIVE_INFINITY;
	const t = Date.parse(iso);
	return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

/** Comparator for `Array.prototype.sort` — stable tie-break on `id`. */
export function compareTimelineEntriesOfficialOrder(
	a: TimelineEntrySortable,
	b: TimelineEntrySortable
): number {
	const ta = occurredAtSortMs(a.occurred_at);
	const tb = occurredAtSortMs(b.occurred_at);
	if (ta !== tb) return ta - tb;
	return a.id.localeCompare(b.id);
}

/** Non-mutating sort copy. */
export function sortTimelineEntriesOfficialOrder<T extends TimelineEntrySortable>(entries: T[]): T[] {
	return [...entries].sort(compareTimelineEntriesOfficialOrder);
}
