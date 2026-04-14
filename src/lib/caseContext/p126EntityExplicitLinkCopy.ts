/**
 * P126-04 — Explicit entity ↔ Timeline / File links (static copy; manual only; no inference).
 * Notes: Case Engine supports `timeline_entry` and `case_file` only — no notebook link type in API.
 */

export const P126_EXPLICIT_LINK_INTRO =
	'Manual links only — one record per action. You choose the target; nothing is inferred or prefilled.';

export const P126_EXPLICIT_LINK_TOGGLE_OPEN = 'Add explicit link';

export const P126_EXPLICIT_LINK_TOGGLE_CLOSE = 'Hide link form';

export const P126_EXPLICIT_LINK_LINK_TO_TIMELINE = 'Link to timeline entry';

export const P126_EXPLICIT_LINK_LINK_TO_FILE = 'Link to case file';

/** Substring filter over the visible list only (no ranking or relevance). */
export const P126_EXPLICIT_LINK_FILTER_LABEL = 'Filter list (contains text)';

export const P126_EXPLICIT_LINK_SELECT_LABEL = 'Choose a record to link';

export const P126_EXPLICIT_LINK_SUBMIT = 'Create link';

export const P126_EXPLICIT_LINK_SUBMITTING = 'Creating link…';

export const P126_EXPLICIT_LINK_LOAD_ERROR = 'Could not load timeline or files for this case.';

export const P126_EXPLICIT_LINK_EMPTY_ELIGIBLE =
	'No records available to link for this type, or every visible record is already linked.';

export const P126_EXPLICIT_LINK_RETIRED = 'Adding links is not available while this entity is retired.';
