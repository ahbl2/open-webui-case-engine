/**
 * P129-01 — Activity / audit surface identity: static strings only (no stores, no routing).
 */

export const P129_ACTIVITY_SURFACE_TITLE = 'Activity';

/** Short lead (tab body); full audit text stays in the disclosure on this surface. */
export const P129_ACTIVITY_FRAMING_LEAD =
	'Newest-first record of actions stored for this case. The Timeline tab holds the official chronology; this feed is a read-only audit trail.';

export const P129_ACTIVITY_FRAMING_DETAILS_TOGGLE = 'Audit notes';

/** Single-line header hint (full lead stays in `title` tooltip + disclosure). */
export const P129_ACTIVITY_FRAMING_INLINE_HINT =
	'Not the Timeline · read-only audit trail (newest first).';

/** What this surface is for. */
export const P129_ACTIVITY_FRAMING_BODY_PRIMARY =
	'This surface lists actions the Case Engine stored for this case. Each line states what occurred; nothing here is ranked or summarized.';

/** Authority boundary — Timeline vs this surface. */
export const P129_ACTIVITY_FRAMING_BODY_TIMELINE =
	'The authoritative case timeline is the Timeline tab. This surface is a read-only action history; it is not the Timeline and does not replace it.';

/** Intake boundary — Proposals vs Timeline. */
export const P129_ACTIVITY_FRAMING_BODY_PROPOSALS =
	'Proposal intake items are not Timeline entries until accepted into the Timeline on the governed path. This surface does not treat proposals as timeline entries.';

/** Non-interpretation. */
export const P129_ACTIVITY_FRAMING_BODY_NO_EVALUATION =
	'This surface does not interpret events, evaluate outcomes, or rank entries.';

/** Supported types only — no completeness claim beyond emitted events. */
export const P129_ACTIVITY_FRAMING_BODY_COVERAGE =
	'Displays only activity events emitted by the Case Engine for this case (supported event types).';

/** Sidebar tab `title` (short). */
export const P129_NAV_TITLE_ACTIVITY =
	'Recorded actions in this case (read-only). Not the Timeline.';
