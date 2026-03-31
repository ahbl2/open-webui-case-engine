/**
 * P19.75-02 / P20-PRE-01: `/access-unavailable` serves both true outages and transient
 * browser-resolve failures (429, 5xx, …). Messaging must reflect `caseEngineAuthState.state`.
 */

export type AccessUnavailableBanner = {
	title: string;
	lead: string;
	hint: string;
};

/** Subset of CaseEngineAuthState['state'] that maps to this page + generic fallback. */
export function accessUnavailableBanner(
	state: string | null | undefined
): AccessUnavailableBanner {
	switch (state) {
		case 'rate_limited':
			return {
				title: 'Too many requests',
				lead: 'The Case Engine authorization service is temporarily rate-limiting sign-ins. This usually clears after a short wait.',
				hint: 'Wait a minute, then tap Retry. If this keeps happening, contact your administrator.'
			};
		case 'auth_http_error':
			return {
				title: 'Authorization failed',
				lead: 'Case Engine did not accept this Open WebUI session for workspace access.',
				hint: 'Try Sign out and sign in again, or contact your administrator.'
			};
		case 'ce_server_error':
			return {
				title: 'Authorization service error',
				lead: 'Case Engine returned a server error while checking workspace access.',
				hint: 'Please try again shortly. If the problem continues, contact your administrator.'
			};
		case 'ce_client_error':
			return {
				title: 'Authorization check failed',
				lead: 'Case Engine could not complete the authorization request.',
				hint: 'Try Retry or Sign out. Contact your administrator if this persists.'
			};
		default:
			return {
				title: 'Service Unavailable',
				lead: 'The Case Engine authorization service could not be reached.',
				hint: 'Workspace access requires a successful authorization check. Please try again or contact your administrator.'
			};
	}
}
