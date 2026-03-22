/**
 * P19-05: Pure helper that maps a Case Engine authorization state to a frontend routing decision.
 *
 * This function is the single source of truth for which auth states are allowed to enter
 * the detective workspace and which must be blocked. It is intentionally stateless and
 * dependency-free so it can be unit tested without a browser or Svelte runtime.
 *
 * DOCTRINE:
 * - 'active'  → proceed; user is authorized to enter the workspace
 * - 'transient_ce' → CE responded with a non-network HTTP error (429, 401, 5xx, …) on browser-resolve.
 *   P20-PRE-01: must NOT load the app shell as if Case Engine linkage succeeded — redirect to /access-unavailable
 *   (explicit failure; no silent partial OWUI session without a resolved CE auth path).
 * - anything else → blocked; the frontend must NOT load the detective workspace as “fully authorized”
 * - 'unavailable' is treated as blocked (fail-closed, not fail-open) — only for true reachability failure
 */

export type AuthStateDecision =
	| 'proceed'       // active user — workspace may load
	| 'transient_ce' // rate_limited / HTTP auth or server errors from browser-resolve — blocked (P20-PRE-01)
	| 'pending'       // pending/denied_no_profile — route to /access-pending
	| 'disabled'      // disabled — route to /access-disabled
	| 'unavailable';  // backend unreachable — route to /access-unavailable

/**
 * Returns the routing decision for a given Case Engine auth state string.
 * Unknown or null states are treated as 'pending' (conservative/blocked default).
 */
export function resolveAuthStateDecision(state: string | null | undefined): AuthStateDecision {
	if (state === 'active') return 'proceed';
	if (state === 'disabled') return 'disabled';
	if (state === 'unavailable') return 'unavailable';
	if (
		state === 'rate_limited' ||
		state === 'auth_http_error' ||
		state === 'ce_server_error' ||
		state === 'ce_client_error'
	) {
		return 'transient_ce';
	}
	// 'pending', 'denied_no_profile', null, undefined, or any unknown value → pending gate
	return 'pending';
}

/**
 * Returns the redirect path for a blocked auth state decision.
 * Returns null when the decision is 'proceed' (no redirect needed).
 */
export function blockedRedirectPath(decision: AuthStateDecision): string | null {
	switch (decision) {
		case 'proceed':       return null;
		case 'transient_ce':  return '/access-unavailable';
		case 'disabled':      return '/access-disabled';
		case 'unavailable':   return '/access-unavailable';
		case 'pending':
		default:              return '/access-pending';
	}
}
