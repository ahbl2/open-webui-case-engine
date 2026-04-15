/**
 * P131-05 — Command Center boundary: read-only surface, explicit navigation to case workspace only.
 * P132-03 — No client-side access checks here; Case Engine decides what exists and what is visible.
 *
 * All navigation to a case from Command Center must go through `navigateCommandCenterToCaseWorkspace`.
 */

/** Compile-time + runtime anchor: Command Center is read-only. */
export const COMMAND_CENTER_READ_ONLY_MODE: true = true;

export type CommandCenterNavigationSource = 'case_list' | 'activity_feed' | 'workflow_snapshot';

/** Document-only markers for ordering regression coverage (no runtime effect). */
export const COMMAND_CENTER_ORDERING_CASE_LIST = 'last_timeline_entry_occurred_at_desc' as const;
export const COMMAND_CENTER_ORDERING_ACTIVITY = 'occurred_at_desc' as const;
export const COMMAND_CENTER_ORDERING_WORKFLOW = 'case_list_order' as const;

export function assertCommandCenterReadOnly(): void {
	if (COMMAND_CENTER_READ_ONLY_MODE !== true) {
		throw new Error('Command Center: read-only boundary violated');
	}
}

/**
 * Validates a case id for navigation. Fails closed on empty or path-like values.
 * Allowed: alphanumeric, hyphen, underscore (covers Case Engine UUID-style ids).
 */
export function assertCommandCenterCaseIdForNavigation(caseId: string): string {
	const s = String(caseId ?? '').trim();
	if (!s) {
		throw new Error('Command Center: case id required for navigation');
	}
	if (s.includes('/') || s.includes('\\') || s.includes('..')) {
		throw new Error('Command Center: invalid case id');
	}
	if (!/^[a-zA-Z0-9_-]+$/.test(s)) {
		throw new Error('Command Center: case id contains disallowed characters');
	}
	return s;
}

/**
 * Single allowed destination shape from Command Center: `/case/:id` (case workspace root only).
 */
export function commandCenterCaseWorkspaceHref(caseId: string): string {
	assertCommandCenterReadOnly();
	const id = assertCommandCenterCaseIdForNavigation(caseId);
	const path = `/case/${id}`;
	if (!/^\/case\/[^/]+$/.test(path)) {
		throw new Error('Command Center: disallowed navigation target');
	}
	return path;
}

/**
 * Explicit user-triggered navigation only (call from click / Enter / Space handlers).
 * Does not schedule navigation; does not run on mount or reactive data success.
 */
export function navigateCommandCenterToCaseWorkspace(
	gotoFn: (href: string) => void | Promise<void>,
	caseId: string,
	_source: CommandCenterNavigationSource
): void {
	const href = commandCenterCaseWorkspaceHref(caseId);
	void gotoFn(href);
}
