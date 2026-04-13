/**
 * P103 — Mirror of DetectiveCaseEngine `citationNavigationTypes.ts` (consumer-only).
 * Keep in sync with Case Engine `CITATION_NAVIGATION_CONTRACT_VERSION` and payload shape.
 */
export const P103_CITATION_NAVIGATION_CONTRACT_VERSION = 'p103.1' as const;

/** Aligned to Case Engine `CITATION_NAVIGATION_ROUTE_KEYS`. */
export type P103CitationNavigationRouteKey =
	| 'timeline'
	| 'tasks'
	| 'files'
	| 'notes'
	| 'summary';

/** Subset of Phase 102 citation kinds needed for OWUI navigation typing. */
export type P103CitationKind =
	| 'timeline_entry'
	| 'case_task'
	| 'case_file'
	| 'notebook_note'
	| 'case_read_model';

/**
 * Resolved navigation payload from Case Engine `resolveCitationNavigation` (ok branch).
 * OWUI consumes per-ticket surfaces (timeline/tasks/files/…).
 */
export interface CitationNavigationPayload {
	readonly contract_version: typeof P103_CITATION_NAVIGATION_CONTRACT_VERSION;
	readonly case_id: string;
	readonly citation_kind: P103CitationKind;
	readonly target_id: string;
	readonly route_key: P103CitationNavigationRouteKey;
	readonly anchor?: { summary_fragment_id?: string };
	readonly text_span?: { start: number; end: number };
}
