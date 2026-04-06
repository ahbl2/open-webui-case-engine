/**
 * P41-44-FU1 — Detect stale `loadMoreEntries` responses after case switch or `loadEntries` / filter refresh.
 *
 * `activeEntriesLoadId` increments on every full timeline reload (same as `loadEntries` freshness).
 * Pair with a per-operation epoch (`timelineLoadMoreEpoch` + `myLoadMoreOp`) so `finally` only
 * clears `isLoadingMore` when this request is still the latest op (see `+page.svelte`).
 */
export function isStaleTimelineLoadMoreAppend(
	fetchGenerationAtStart: number,
	activeEntriesLoadIdNow: number,
	caseIdAtStart: string,
	caseIdNow: string
): boolean {
	return (
		fetchGenerationAtStart !== activeEntriesLoadIdNow || caseIdAtStart !== caseIdNow
	);
}
