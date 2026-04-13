/**
 * P101-05 — Shared operator-facing copy for Phase 101 proposal surfaces (Timeline + Tasks).
 * Single source of truth for labels; keep surface-neutral where possible.
 */

export const P101_PANEL_EYEBROW = 'Phase 101 proposal';

/** One-line doctrine: proposal vs authoritative record (both surfaces). */
export const P101_PROPOSAL_DOCTRINE =
	'A proposal is not yet an official record. Case Engine review and approval are required before anything is written to the Timeline or to operational Tasks. AI output is draft only — you submit explicitly; nothing auto-creates.';

export const P101_LABEL_PROPOSAL_TYPE = 'Proposal type';

export const P101_LABEL_GENERATE = 'Generate draft';

export const P101_LABEL_GENERATING = 'Generating…';

export const P101_LABEL_SUBMIT = 'Submit proposal';

export const P101_LABEL_SUBMITTING = 'Submitting…';

export const P101_LABEL_INSTRUCTIONS = 'Instructions for the model (required)';

export const P101_LABEL_OPTIONAL_CONTEXT =
	'Optional context (paste only — not auto-fetched from the case)';

export const P101_LABEL_SOURCE_REFS =
	'Optional source_refs (JSON array — same-case ids only; validated before submit)';

export const P101_LABEL_REVIEW_EDIT_TIMELINE = 'Review / edit proposal draft (timeline entry)';

export const P101_LABEL_REVIEW_EDIT_TASK = 'Review / edit proposal draft (task)';

/** Traceability section — non-authoritative framing (AI + optional refs). */
export const P101_TRACE_SUMMARY_LABEL = 'Traceability (non-authoritative context)';

export const P101_TRACE_MODEL_OUTPUT_LABEL = 'Raw model output — not submitted as-is; draft fields above are what you submit.';

export const P101_TRACE_SOURCE_REFS_PREVIEW_LABEL = 'source_refs preview (same format as request body)';

export const P101_TOAST_PROPOSAL_CREATED =
	'Proposal created. It is not a record until reviewed and approved in Case Engine.';

export const P101_ERR_CASE_ENGINE_UNAVAILABLE = 'Case Engine session unavailable — cannot create a proposal.';

export const P101_ERR_NO_MODEL = 'No AI model is available. Check your model configuration.';

export const P101_ERR_NO_OWUI_TOKEN = 'Open WebUI session unavailable — cannot call the AI endpoint.';

export const P101_ERR_INSTRUCTIONS_SHORT = 'Instructions must be at least 3 characters.';

export const P101_ERR_NO_DRAFT = 'Generate or complete a draft before submitting.';

export const P101_ERR_CASE_CHANGED =
	'The active case changed before this operation finished. Discard this view or retry on the current case.';

export const P101_ERR_SUBMIT_FAILED = 'Proposal could not be created.';
