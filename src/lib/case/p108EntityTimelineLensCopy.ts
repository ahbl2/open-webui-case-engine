/**
 * P108-01 — Entity → timeline lens. P108-02 — Entity → files lens.
 * P108-03 — Return navigation from lens surfaces.
 * P108-04 — Shared banner / integration.
 * P108-05 — Doctrine-safe wording (read-only, explicit declared links only).
 */

export const P108_ENTITY_LENS_RETURN_TO_ENTITY = 'Return to entity';

/** Shared banner lead (timeline + files); same component for both surfaces. */
export const P108_ENTITY_TIMELINE_LENS_BANNER =
	'Read-only entity link filter (explicit links only):';

export const P108_ENTITY_TIMELINE_LENS_CLEAR = 'Clear entity link filter';

export const P108_ENTITY_TIMELINE_LENS_VIEW_ACTION =
	'Open timeline with entity link filter (read-only)';

export const P108_ENTITY_TIMELINE_LENS_EMPTY =
	'No timeline entries have explicit links to this entity. Clear the filter to see the full case timeline.';

export const P108_ENTITY_FILES_LENS_VIEW_ACTION =
	'Open files with entity link filter (read-only)';

export const P108_ENTITY_FILES_LENS_EMPTY =
	'No case files have explicit links to this entity. Clear the filter to see the full case file list.';

/** Empty-state title when the files list is empty under the entity lens (explicit links only). */
export const P108_ENTITY_FILES_LENS_EMPTY_TITLE = 'No case files with explicit entity links';

/**
 * P108-05 — Status line when the timeline entity lens is active: count of explicitly linked rows only.
 */
export function p108EntityLensTimelineLoadedCountLabel(linkedCount: number): string {
	const unit = linkedCount === 1 ? 'entry' : 'entries';
	return `${linkedCount} case timeline ${unit} with explicit entity links shown (read-only filter)`;
}

/**
 * P108-05 — Status line when the files entity lens is active: count of explicitly linked rows only.
 */
export function p108EntityLensFilesLoadedCountLabel(linkedCount: number): string {
	const unit = linkedCount === 1 ? 'file' : 'files';
	return `${linkedCount} case ${unit} with explicit entity links shown (read-only filter)`;
}
