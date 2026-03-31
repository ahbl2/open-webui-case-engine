/**
 * P34-21 — Derive whether the structured-notes UI may be offered (health + optional PUBLIC suppress).
 * Server authority: GET /health `structured_notes_enabled` from Case Engine.
 */

export function readStructuredNotesServerEnabledFromHealth(
	health: Record<string, unknown> | null | undefined
): boolean {
	if (health == null || typeof health !== 'object') return false;
	return health.structured_notes_enabled === true;
}

/** When `PUBLIC_STRUCTURED_NOTES_ENABLED === '0'`, hide structured-notes controls even if the server enables the routes. */
export function computeStructuredNotesUiOffered(
	healthFetchCompleted: boolean,
	serverReportsEnabled: boolean,
	publicStructuredNotesSuppressed: boolean
): boolean {
	return healthFetchCompleted && serverReportsEnabled && !publicStructuredNotesSuppressed;
}
