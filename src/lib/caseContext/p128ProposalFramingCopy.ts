/**
 * P128-01 — Proposals intake framing (static operator copy; candidate Timeline entries only; no authority).
 */

export const P128_PROPOSALS_SURFACE_TITLE = 'Proposals — Candidate Timeline Entries';

export const P128_PROPOSALS_FRAMING_BODY_PRIMARY =
	'Proposals here are candidate rows for the Timeline. They are not the official case record, not Notes drafts, not file evidence, not workflow items, and not entity records.';

export const P128_PROPOSALS_FRAMING_BODY_SECONDARY =
	'User-created only. The system does not add proposals from Notes, Workflow, Files, or Entities. There is no inference or automated intake.';

export const P128_PROPOSALS_FRAMING_BODY_TERTIARY =
	'A proposal becomes a Timeline entry only after explicit review and acceptance on a governed path—no silent writes to the Timeline.';

/** P128-05 — Acceptance semantics: official record vs candidates. */
export const P128_PROPOSALS_FRAMING_BODY_ACCEPTANCE =
	'Accepting a proposal writes the official Timeline entry (or governed note) from the stored proposal text. Until then, proposals are candidates only—not part of the committed Timeline.';

export const P128_PROPOSALS_FRAMING_BODY_EMPTY_REINFORCE =
	'If nothing appears below, no proposals exist yet; nothing is generated for you without your action.';

/** P128-05 — Shell header link: cross-surface boundary (not Timeline truth). */
export const P128_HEADER_PENDING_PROPOSALS_LINK_TITLE =
	'Candidate proposals awaiting review — not the official Timeline until accepted.';

/** P128-05 — Case overview summary card helper line. */
export const P128_OVERVIEW_PENDING_PROPOSALS_HINT =
	'Candidates for the Timeline — not the official case record until accepted.';
