/** P109-01 — operator copy for manual evidence selection (non-authoritative; session-only). */

export const P109_EVIDENCE_SELECTION_BAR_LABEL = 'Manual selection';

export const P109_EVIDENCE_SELECTION_BAR_EMPTY =
	'No items selected. Choose timeline entries or files to include for later packaging.';

export const P109_EVIDENCE_SELECTION_BAR_COUNTS = (total: number, timeline: number, files: number) =>
	`${total} selected — ${timeline} timeline · ${files} file${files === 1 ? '' : 's'}`;

export const P109_EVIDENCE_SELECTION_CLEAR = 'Clear selection';

export const P109_EVIDENCE_SELECTION_TIMELINE_TOGGLE_TITLE =
	'Include this timeline entry in your manual selection for this case (session only; not saved).';

export const P109_EVIDENCE_SELECTION_FILE_TOGGLE_TITLE =
	'Include this file in your manual selection for this case (session only; not saved).';
