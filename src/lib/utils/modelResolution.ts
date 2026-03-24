/**
 * P21-06 — Explicit model resolution chain.
 *
 * Priority order for new-chat model selection:
 *   1. Forced admin model  — lock_default_models is true + default_models is set
 *   2. User persisted preference — settings.models (saved via "Set as default" or auto-persist)
 *   3. Admin configured default  — config.default_models
 *   4. First available model     — hardware-level fallback
 *
 * Only returns ids that exist in availableModelIds.
 * Returns [''] when no models are available at all.
 *
 * URL params, folder overrides, and sessionStorage are handled by the caller
 * before reaching this function; this function covers the settings-layer chain only.
 */
export function resolveInitialModels({
	availableModelIds,
	lockDefaultModels,
	defaultModelIds,
	userModelIds
}: {
	availableModelIds: string[];
	lockDefaultModels: boolean;
	defaultModelIds: string[];
	userModelIds: string[];
}): string[] {
	function filterAvailable(ids: string[]): string[] {
		return ids.filter((id) => availableModelIds.includes(id));
	}

	if (availableModelIds.length === 0) {
		return [''];
	}

	// Step 1: forced admin model — user preference is bypassed entirely.
	// Non-admin users will have the selector disabled in the UI.
	if (lockDefaultModels && defaultModelIds.length > 0) {
		const forced = filterAvailable(defaultModelIds);
		if (forced.length > 0) return forced;
	}

	// Step 2: user persisted preference (settings.models).
	if (userModelIds.length > 0) {
		const persisted = filterAvailable(userModelIds);
		if (persisted.length > 0) return persisted;
	}

	// Step 3: admin configured default (config.default_models).
	if (defaultModelIds.length > 0) {
		const defaults = filterAvailable(defaultModelIds);
		if (defaults.length > 0) return defaults;
	}

	// Step 4: first available model.
	return [availableModelIds[0]];
}
