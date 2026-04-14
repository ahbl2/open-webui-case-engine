/**
 * P129-01 — Activity / audit surface identity: static strings only (no stores, no routing).
 */

export const P129_ACTIVITY_SURFACE_TITLE = 'Activity — Case History';

/** What this surface is for. */
export const P129_ACTIVITY_FRAMING_BODY_PRIMARY =
	'This surface shows actions that were recorded in this case. Entries are factual records of actions taken, not judgments about them.';

/** Authority boundary — Timeline vs this surface. */
export const P129_ACTIVITY_FRAMING_BODY_TIMELINE =
	'The official case record is the Timeline. This surface is not the Timeline and does not replace it.';

/** Intake boundary — Proposals vs committed record. */
export const P129_ACTIVITY_FRAMING_BODY_PROPOSALS =
	'Proposals are candidates for the Timeline until accepted and committed on the governed path. This surface does not treat proposals as the official record.';

/** Non-interpretation. */
export const P129_ACTIVITY_FRAMING_BODY_NO_EVALUATION =
	'This surface does not interpret events, evaluate outcomes, or rank entries.';

/** Sidebar tab `title` (short). */
export const P129_NAV_TITLE_ACTIVITY =
	'Recorded actions in this case — read-only; not the official Timeline.';
