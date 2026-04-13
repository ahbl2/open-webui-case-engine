/**
 * P108-04 — Shared view-state for `entityLens` read-only filter (timeline + files surfaces).
 * Presentation and test ids only — no data/filter semantics (those stay in P108-01 / P108-02).
 */

export type P108EntityLensSurface = 'timeline' | 'files';

/** Outer wrapper classes per surface (timeline flush strip vs files card in tab body). */
export const P108_ENTITY_LENS_BANNER_OUTER_CLASS: Record<P108EntityLensSurface, string> = {
	timeline:
		'shrink-0 px-4 py-2 border-b border-amber-200/80 dark:border-amber-900/50 bg-amber-50/90 dark:bg-amber-950/30 flex flex-wrap items-center justify-between gap-2',
	files:
		'rounded-md border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/90 dark:bg-amber-950/30 px-3 py-2 mb-3 flex flex-wrap items-center justify-between gap-2'
};

export function p108EntityLensBannerTestIds(surface: P108EntityLensSurface): {
	banner: string;
	returnToEntity: string;
	clear: string;
} {
	return {
		banner: `case-${surface}-entity-lens-banner`,
		returnToEntity: `case-${surface}-entity-lens-return-to-entity`,
		clear: `case-${surface}-entity-lens-clear`
	};
}
