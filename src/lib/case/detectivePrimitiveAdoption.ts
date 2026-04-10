/**
 * P74-10 — Primitive-layer adoption boundary (strangler-friendly; no runtime feature-flag framework).
 *
 * - **`DETECTIVE_PRIMITIVE_LAYER_VERSION`** — bump only when DS primitive *contracts* (required CSS imports or
 *   `detectivePrimitiveFoundation` export shape) intentionally change.
 * - **`DETECTIVE_DS_STYLE_IMPORT_ORDER`** — must match the contiguous `@import` list for DS layers in `src/app.css`.
 *
 * Authoritative rules: `docs/phases/phase_74/P74-10_PRIMITIVE_LAYER_MIGRATION_BOUNDARY.md`
 * Class / token maps: `detectivePrimitiveFoundation.ts` (import `DS_*` from there — not from this file).
 */

export const DETECTIVE_PRIMITIVE_LAYER_VERSION = 3 as const;

/** Filenames under `src/lib/styles/` — order must match `app.css` DS `@import` block (Tier L follows separately). */
export const DETECTIVE_DS_STYLE_IMPORT_ORDER = [
	'detectiveDesignTokens.css',
	'detectiveTypography.css',
	'detectiveSemanticStatus.css',
	'detectiveButtons.css',
	'detectiveBadgesChips.css',
	'detectiveTooltip.css',
	'detectiveSurfaces.css',
	'detectiveEmptyLoadingSkeleton.css',
	'detectiveErrorBannerToast.css',
	'detectiveModalDrawerConfirm.css',
	'detectiveAskIntegrity.css'
] as const;
