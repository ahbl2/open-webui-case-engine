/**
 * P19-06 — Case workspace nav section resolution.
 * P76-05 — Deterministic first-path-segment matching after `/case/:id/` so nested routes
 * (e.g. intelligence/entity/...) keep the parent tab active — no substring collisions.
 * P86-05 — `tasks` resolves for `/case/:id/tasks` (operational surface; not Timeline authority).
 *
 * Pure function — safe for layout + contracts tests.
 */

export type CaseNavSection =
	| 'chat'
	| 'summary'
	| 'workflow'
	| 'warrants'
	| 'intelligence'
	| 'graph'
	| 'proposals'
	| 'timeline'
	| 'files'
	| 'notes'
	| 'activity'
	| 'entities'
	// P86-05: `tasks` — operational-only; not Timeline authority.
	| 'tasks'
	// P102-04: single-case read-only query (Case Engine `POST /cases/:id/query`).
	| 'query'
	// P109-03: explicit evidence groupings (non-authoritative; Case Engine storage).
	| 'evidence-sets'
	// P117-04: Phase 117 `case_workflow_items` — distinct URL from legacy `workflow` tab.
	| 'case-workflow'
	// P130-01 — Non-authoritative AI assistant surface (explicit user-initiated session only).
	| 'ai-workspace';

const VALID_CASE_SECTIONS = new Set<string>([
	'chat',
	'summary',
	'workflow',
	'warrants',
	'intelligence',
	'graph',
	'proposals',
	'timeline',
	'files',
	'notes',
	'activity',
	'entities',
	// P86-05: operational Tasks route — not Timeline authority.
	'tasks',
	// P102-04: Case query — read-only; not cross-case search.
	'query',
	// P109-03: evidence sets — explicit grouping only; not Timeline authority.
	'evidence-sets',
	// P117-04: operational workflow items (Phase 117); not legacy P13 workflow.
	'case-workflow',
	'ai-workspace'
]);

/**
 * Returns the active CaseNavSection for the given pathname (path only; no query/hash).
 *
 * Uses the first segment after `/case/:caseId/` as the tab key. If that segment is not a
 * known section, falls back to `'chat'` — covers bare `/case/[id]` (redirect pending),
 * unknown subroutes, and empty input.
 */
export function resolveActiveCaseSection(pathname: string): CaseNavSection {
	if (!pathname || !pathname.startsWith('/case/')) return 'chat';
	const segments = pathname.split('/').filter(Boolean);
	if (segments.length < 3 || segments[0] !== 'case') return 'chat';
	const first = segments[2];
	if (VALID_CASE_SECTIONS.has(first)) return first as CaseNavSection;
	return 'chat';
}
