/**
 * P118-04 — Factual copy for Case Engine navigation outcomes (no interpretive wording).
 */

export const P118_NAVIGATION_LOADING_COPY = 'Checking navigation…';

export const P118_NAVIGATION_PREFETCH_FAILED_COPY =
	'Could not load navigation from Case Engine for these citations.';

export const P118_NAVIGATION_UNSUPPORTED_KIND_COPY =
	'Navigation is not available for this record type in this build.';

export const P118_NAVIGATION_RECORD_UNAVAILABLE_COPY =
	'This record is not available for navigation (missing, wrong case, or inactive).';

export const P118_NAVIGATION_UNKNOWN_KIND_COPY = 'This record type is not recognized for navigation.';

export const P118_NAVIGATION_INVALID_REFERENCE_COPY = 'This citation reference is not valid for navigation.';

export const P118_NAVIGATION_MISSING_CASE_COPY = 'Case context is missing for navigation.';

export const P118_NAVIGATION_CASE_MISMATCH_COPY =
	'Navigation does not match the active case. Nothing was opened.';

/** Operational workflow items — cited for transparency; no navigable route in contract. */
export const P118_NAVIGATION_WORKFLOW_ITEM_COPY =
	'Workflow item (operational). Navigation to this item is not available in this build.';
