/**
 * P38-07 — Operator-facing Timeline copy (direct log vs Proposals / P19).
 * Centralized for regression tests; wording only — no behavior.
 *
 * Post-P39 bug fix: TIMELINE_TIME_ZONE_LABEL corrected from UTC to ET.
 * The Timeline composer and edit form collect local Eastern time, not UTC.
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
 * Timezone context label rendered beside time inputs in the Timeline composer
 * and inline edit form. Detectives enter Eastern time; this label reflects that.
 * Fixed post-P39: was incorrectly shown as "(UTC)".
 */
export const TIMELINE_TIME_ZONE_LABEL = '(ET)';

/**
 * Full phrase used in tooltip/title attributes for the time input.
 * Must match the timezone context labelled by TIMELINE_TIME_ZONE_LABEL.
 */
export const TIMELINE_TIME_ZONE_TOOLTIP = 'Required — time when this occurred (ET)';
