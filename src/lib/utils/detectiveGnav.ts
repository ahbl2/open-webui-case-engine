/**
 * P75-04 — Primary app sidebar (GNAV) active-state resolution.
 * P75-08 — Wave 2 routing handoff: same resolver drives GNAV across `/home`, `/cases`, `/case/*`,
 * `/search`, and `showSearch` (modal). `/home` is OCC ownership (no alternate command-center URL).
 * `/search` is a real route that opens `SearchModal` — modal-open still wins active state.
 * P75-09: `SearchModal` adds shell modes (Search / Jump / Command / Workspace) inside this same modal — no second surface.
 * Case workspace chrome stays under `/case/:id/...` only (no app-level case tab strip).
 *
 * @see GLOBAL_NAVIGATION_AND_COMMAND_SPEC.md — exactly one primary app nav meaning at a time.
 *
 * Primary ids:
 * - `home` — /home (Operator Command Center / desktop hub)
 * - `cases` — /cases or inside /case/* (contextual “in case” highlights Cases per spec)
 * - `search` — global search modal open (accelerator; takes precedence while open), or pathname /search
 * - `null` — /admin and other unified-shell routes where no Core item applies
 */
export type DetectiveGnavPrimaryId = 'home' | 'cases' | 'search' | null;

export function resolveDetectiveGnavPrimaryActive(
	pathname: string,
	showSearchOpen: boolean
): DetectiveGnavPrimaryId {
	if (showSearchOpen) return 'search';

	const p = pathname.split('?')[0] ?? pathname;

	if (p === '/admin' || p.startsWith('/admin/')) return null;

	if (p.startsWith('/case/')) return 'cases';

	if (p === '/cases' || p.startsWith('/cases/')) return 'cases';

	if (p === '/home' || p.startsWith('/home/')) return 'home';

	// Unified shell also matches /search path if introduced later
	if (p === '/search' || p.startsWith('/search/')) return 'search';

	return null;
}
