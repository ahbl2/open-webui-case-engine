/**
 * P41-44-FU3 — True when the Timeline list fetch uses non-default server-side filters
 * (`timelinePageQueryOpts` / `GET /cases/:id/entries` query params).
 *
 * Must stay aligned with the inverse of `noServerFilters` in `+page.svelte` `loadEntries`.
 */
export type TimelineServerFilterState = {
	filterQueryForApi: string;
	/** Sentinel `'all'` means no `types` param. */
	activeFilter: string;
	filterDateFrom: string;
	filterDateTo: string;
};

export function timelineListUsesServerSideFilters(state: TimelineServerFilterState): boolean {
	return !(
		!state.filterQueryForApi.trim() &&
		state.activeFilter === 'all' &&
		!state.filterDateFrom.trim() &&
		!state.filterDateTo.trim()
	);
}
