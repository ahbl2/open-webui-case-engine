/**
 * P38-07 — Operator-facing Timeline copy (direct log vs Proposals / P19).
 * Centralized for regression tests; wording only — no behavior.
 *
 * Post-P39: label moved off misleading “UTC”.
 * P40-05G: composer/edit/proposal review use `<input type="datetime-local">`.
 * P41-10: values are **America/New_York** civil time (operational zone), matching
 * timeline cards and proposal occurred_at display — not the browser’s local zone.
 */

/** Hover on the "Official record" badge — corrects TL-02 (not proposals-only). */
export const TIMELINE_OFFICIAL_RECORD_BADGE_TITLE =
	'Official timeline: + Log entry saves here; chat intake is reviewed and committed from the Proposals tab.';

/** Subline beside the section header. */
export const TIMELINE_HEADER_SUBLINE =
	'Committed facts only · + Log entry or Proposals commit · drafts → Notes tab';

/** + Log entry button tooltip. */
export const TIMELINE_LOG_ENTRY_BUTTON_TITLE =
	'Record now on the official timeline. Chat intake uses Proposals (review, then commit).';

/** Empty state when the case has no timeline rows. */
export const TIMELINE_EMPTY_STATE_DESCRIPTION =
	'Use + Log entry to save immediately, or run chat intake through Proposals (approve, then commit). Working drafts stay in Notes.';

/**
 * Timezone context label beside datetime-local inputs: same operational zone as
 * timeline `occurred_at` cards (`formatOperationalCaseDateTime*`).
 */
export const TIMELINE_TIME_ZONE_LABEL = '(America/New_York)';

/**
 * Full phrase used in tooltip/title attributes for the time input.
 */
export const TIMELINE_TIME_ZONE_TOOLTIP =
	'Required — date and time when this occurred (America/New_York operational time)';
