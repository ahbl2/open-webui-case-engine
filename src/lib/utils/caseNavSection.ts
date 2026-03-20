/**
 * P19-06 — Case workspace nav section resolution.
 *
 * Determines which left-nav section is currently active based on the URL
 * pathname.  Kept as a pure function so it is independently testable and
 * can be used by both the shell layout and any future section-aware components.
 */

export type CaseNavSection = 'chat' | 'proposals' | 'timeline' | 'files' | 'notes' | 'activity';

/** All recognised section IDs in precedence order (most-specific first). */
const CASE_SECTIONS: CaseNavSection[] = ['timeline', 'files', 'notes', 'activity', 'proposals', 'chat'];

/**
 * Returns the active CaseNavSection for the given pathname.
 *
 * The pathname is matched against each section ID as a path segment.
 * If no section segment is found the function falls back to 'chat' —
 * this covers both the bare /case/[id] route (which immediately redirects
 * to /chat) and any unknown subroutes.
 */
export function resolveActiveCaseSection(pathname: string): CaseNavSection {
	for (const section of CASE_SECTIONS) {
		if (pathname.includes(`/${section}`)) {
			return section;
		}
	}
	return 'chat';
}
