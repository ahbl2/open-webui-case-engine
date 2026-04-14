/**
 * P124-02 — Timeline entry metadata labels (static operator copy; Case Engine field semantics only).
 */

/** Maps to occurred_at — when the event happened. */
export const P124_TIMELINE_LABEL_EVENT_OCCURRED = 'Event occurred';

/** Maps to created_at — when this row was saved to the timeline. */
export const P124_TIMELINE_LABEL_ENTRY_LOGGED_AT = 'Entry logged';

/** Maps to created_by — who saved this entry. */
export const P124_TIMELINE_LABEL_LOGGED_BY = 'Logged by';

/** Definitional tooltips only (field names; no new semantics). */
export const P124_TIMELINE_TOOLTIP_OCCURRED_AT =
	'occurred_at — when the event happened (operational time).';

export const P124_TIMELINE_TOOLTIP_CREATED_AT =
	'created_at — when this entry was saved to the case timeline.';

export const P124_TIMELINE_TOOLTIP_CREATED_BY =
	'created_by — user id of who saved this entry.';
