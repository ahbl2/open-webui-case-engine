/**
 * P38-08 — Disambiguate timeline entry type `note` from the Notes tab (copy only).
 * Stored `timeline_entries.type` value stays `note`; UI labels/tooltips only.
 */

/** Chip, filter chip, and <option> text for type value `note`. */
export const TIMELINE_TYPE_NOTE_DISPLAY_LABEL = 'Note (timeline)';

/** Type badge (when type is `note`) and Type dropdown hover — vs notebook Notes. */
export const TIMELINE_TYPE_NOTE_VS_NOTES_TAB_TOOLTIP =
	'Official timeline category—not the Notes tab (drafts).';
