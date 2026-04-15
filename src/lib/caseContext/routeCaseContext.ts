/**
 * P123-03 — Read-only route case identity (no store, no persistence, no inference).
 *
 * The active case id for case workspace API calls must come only from the current
 * SvelteKit route param `/case/:id/...`. Do not substitute values from persisted client storage,
 * global stores, or prior session state when selecting which case id to send to Case Engine.
 */

/** Route params bag from `$page.params` (or equivalent). */
export type RouteParamsLike = { id?: string } | null | undefined;

/**
 * Returns the trimmed case id from route params, or null if missing/blank.
 * No default, no fallback, no normalization beyond trim.
 */
export function getRouteCaseId(params: RouteParamsLike): string | null {
	if (!params || typeof params.id !== 'string') return null;
	const t = params.id.trim();
	return t.length > 0 ? t : null;
}

/**
 * Same as {@link getRouteCaseId}, but returns an empty string when absent (for props that expect `string`).
 * This is not a “default case id” — it means no id is present in the route.
 */
export function getRouteCaseIdString(params: RouteParamsLike): string {
	return getRouteCaseId(params) ?? '';
}

/** True when the pathname is under `/case/:id/` with a non-empty id segment. */
export function isCaseWorkspacePathname(pathname: string): boolean {
	if (!pathname || !pathname.startsWith('/case/')) return false;
	const segments = pathname.split('/').filter(Boolean);
	return segments.length >= 2 && segments[0] === 'case' && segments[1]!.trim().length > 0;
}
