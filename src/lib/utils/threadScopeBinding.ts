/**
 * P19-08 — Thread Scope Binding utilities.
 *
 * Pure, dependency-free helper functions for classifying thread binding errors
 * and producing human-readable messages. Stateless — safe to import from any
 * context (browser, node, test runner).
 *
 * DOCTRINE:
 * - Case Engine is the authoritative source for scope association validity.
 * - A thread binding must be confirmed by the backend before chat renders.
 * - Frontend never self-assigns scope without a backend confirmation.
 * - Fail-closed: any binding error blocks chat, not silently opens unbound chat.
 */

import type { ThreadScopeErrorKind } from '$lib/stores/caseEngine';

export type { ThreadScopeErrorKind };

/**
 * The result of a thread binding attempt.
 * On success: scope and the returned association record.
 * On failure: an error kind and a user-facing message.
 */
export type ThreadBindSuccess =
	| { success: true; scope: 'case'; caseId: string }
	| { success: true; scope: 'personal' };

export type ThreadBindFailure = {
	success: false;
	kind: ThreadScopeErrorKind;
	message: string;
};

export type ThreadBindResult = ThreadBindSuccess | ThreadBindFailure;

/**
 * Classifies a thrown binding error into a structured error kind.
 *
 * Classification rules (in order of precedence):
 *   'scope_conflict'      — HTTP 400 OR message contains 'Scope conflict' / 'scope conflict'
 *   'access_denied'       — HTTP 401/403 OR message contains 'access denied' / 'forbidden' / 'invalid token' / 'authorization header'
 *   'not_found'           — HTTP 404 OR message contains 'not found'
 *   'backend_unavailable' — TypeError (network failure), or message contains 'fetch' / 'network' / 'ECONNREFUSED'
 *   'unknown'             — anything else
 */
export function classifyBindError(err: unknown): ThreadScopeErrorKind {
	if (err instanceof TypeError) {
		// Typically a fetch/network error (e.g. CORS, offline, ECONNREFUSED)
		return 'backend_unavailable';
	}

	const message =
		err instanceof Error
			? err.message
			: typeof err === 'string'
				? err
				: String(err);

	const lower = message.toLowerCase();

	// HTTP status codes embedded in error messages by the API layer
	if (lower.includes('(400)') || lower.includes('scope conflict')) return 'scope_conflict';
	if (
		lower.includes('(403)') ||
		lower.includes('(401)') ||
		lower.includes('access denied') ||
		lower.includes('forbidden') ||
		lower.includes('invalid token') ||
		lower.includes('authorization header')
	)
		return 'access_denied';
	if (lower.includes('(404)') || lower.includes('not found')) return 'not_found';
	if (
		lower.includes('fetch') ||
		lower.includes('network') ||
		lower.includes('econnrefused') ||
		lower.includes('failed to fetch') ||
		lower.includes('load failed')
	)
		return 'backend_unavailable';

	return 'unknown';
}

/**
 * Returns a user-facing message for a scope conflict error.
 * Explains why the binding was rejected and what the user should do.
 */
export function scopeConflictMessage(requestedScope: 'case' | 'personal'): string {
	if (requestedScope === 'case') {
		return (
			'This thread is already active as a personal thread and cannot simultaneously be ' +
			'a case thread. To use this thread here, remove the personal association first, ' +
			'or start a new thread.'
		);
	}
	return (
		'This thread is already active as a case thread and cannot simultaneously be ' +
		'a personal thread. To use this thread here, remove the case association first, ' +
		'or start a new thread.'
	);
}

/** Returns a user-facing message for an access denied error. */
export function accessDeniedMessage(): string {
	return 'You do not have permission to bind threads to this case. Contact your administrator or case lead.';
}

/** Returns a user-facing message for a backend unavailable error. */
export function backendUnavailableMessage(): string {
	return 'The Case Engine service is unavailable. Thread binding could not be confirmed. Chat is blocked until a successful connection can be made.';
}

/** Returns a user-facing message for a not-found error. */
export function notFoundMessage(): string {
	return 'The requested resource was not found. The case may have been deleted or your access has been revoked.';
}

/**
 * Returns a user-facing message for any ThreadScopeErrorKind.
 * Use this as a fallback when you do not have a specific scope to pass.
 */
export function bindErrorMessage(kind: ThreadScopeErrorKind, scope?: 'case' | 'personal'): string {
	switch (kind) {
		case 'scope_conflict':
			return scopeConflictMessage(scope ?? 'case');
		case 'access_denied':
			return accessDeniedMessage();
		case 'backend_unavailable':
			return backendUnavailableMessage();
		case 'not_found':
			return notFoundMessage();
		default:
			return 'An unexpected error occurred while binding this thread. Please try again.';
	}
}
