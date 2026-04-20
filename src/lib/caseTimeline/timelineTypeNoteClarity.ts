/**
 * P38-08 — Legacy timeline entry type `note` vs the Notes tab (copy only).
 * New entries use other categories (e.g. incident); old rows may still have `type = note`.
 */

/** Chip and list labels for legacy `note` rows (still in DB). */
export const TIMELINE_TYPE_NOTE_DISPLAY_LABEL = 'Note (timeline)';

/** Type badge (when type is `note`) — vs notebook Notes. */
export const TIMELINE_TYPE_NOTE_VS_NOTES_TAB_TOOLTIP =
	'Official timeline category—not the Notes tab (drafts).';

/** Composer / edit Type <select> — applies to all categories, not notebook Notes. */
export const TIMELINE_TYPE_FIELD_TOOLTIP =
	'Official timeline category—not the Notes tab (drafts).';
