/**
 * P41-44-FU4 — Recompute `totalEntries` / `hasMore` after one matching row is removed
 * from the active timeline list (soft-delete while not in ADMIN include-deleted mode).
 *
 * Assumes the row was part of the current server query’s matching set (it was visible).
 * Mirrors a first-page `GET` response: `hasMore === loadedCount < total` for that query.
 */
export function timelineTotalsAfterRemoveOneFromMatchingSet(
	totalEntries: number,
	loadedCount: number
): { totalEntries: number; hasMore: boolean } {
	const nextTotal = Math.max(0, totalEntries - 1);
	const hasMore = loadedCount < nextTotal;
	return { totalEntries: nextTotal, hasMore };
}

/**
 * `lastKnownUnfilteredTotal` tracks the unfiltered list size (see `loadEntries` when no
 * server filters). When filters are active, that cached value is not updated here.
 */
export function timelineLastKnownUnfilteredAfterActiveDelete(
	lastKnown: number,
	serverSideFiltersActive: boolean
): number {
	if (serverSideFiltersActive) return lastKnown;
	return Math.max(0, lastKnown - 1);
}
