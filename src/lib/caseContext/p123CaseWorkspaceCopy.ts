/**
 * P123-05 — Shared operator copy for case workspace empty / unavailable states.
 * No logic — import strings only.
 */

/** Surface placeholder when the route has no valid case id segment (Timeline / Notes / Files). */
export const P123_NO_CASE_ROUTE_BODY =
	'No case selected — no valid case id in the route.';

/** Built-in `CaseWorkspaceLayout` header strip when `hasActiveCase` is false. */
export const P123_LAYOUT_HEADER_NO_CASE = 'No case selected';

/**
 * Sidebar: Phase 123 surface links (Timeline / Notes / Files) require a valid route case id.
 * Shown when authenticated but the URL has no usable `id` param (no links are rendered in that state).
 */
export const P123_SIDEBAR_SURFACE_LINKS_UNAVAILABLE =
	'Select a case from the list above to open Timeline, Notes, or Files.';

export const P123_CASE_LIST_EMPTY = 'No cases';

export const P123_CASE_LIST_LOADING = 'Loading…';
