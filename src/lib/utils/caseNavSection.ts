/**
 * P19-06 — Case workspace nav section resolution.
 * P76-05 — Deterministic first-path-segment matching after `/case/:id/` so nested routes
 * (e.g. intelligence/entity/...) keep the parent tab active — no substring collisions.
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
	| 'entities';

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
	'entities'
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
