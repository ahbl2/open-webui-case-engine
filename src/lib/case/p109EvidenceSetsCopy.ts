/**
 * P109-03 — Operator copy for evidence set management (explicit grouping; non-authoritative).
 * P109-04 — Read-only detail copy.
 * P109-05 — Centralized audit attribution + nav label; constraint phrasing.
 */

/** Evidence sets surface label; use where the route is linked (P109 panels / future nav). P123-02 rail is Timeline/Notes/Files only. */
export const P109_EVIDENCE_SETS_NAV_LABEL = 'Evidence sets (grouping)';

/** P109 — Files tab toolbar: go to the page where session selection is turned into a saved grouping. */
export const P109_EVIDENCE_SETS_FILES_TAB_OPEN_LINK = 'Open Evidence sets';

export const P109_EVIDENCE_SETS_PAGE_TITLE = P109_EVIDENCE_SETS_NAV_LABEL;

export const P109_EVIDENCE_SETS_SUPPORTING_COPY =
	'Manual groupings only. The Timeline is the official record; files are supporting material. Saved sets are explicit lists stored in Case Engine—not findings, rankings, or finished outputs.';

export const P109_EVIDENCE_SETS_SESSION_SELECTION_LABEL =
	'Current manual selection (this browser session, not saved until you use Create below)';

export const P109_EVIDENCE_SETS_SAVED_LIST_LABEL = 'Saved sets for this case (Case Engine)';

/** P109-05 — Clarifies audit fields; avoids review/approval framing. */
export const P109_EVIDENCE_SETS_SAVED_LIST_AUDIT_HINT =
	'Each row shows the set name plus Case Engine audit fields (saved time and user id). This is not a review, sign-off, or compliance gate.';

export const P109_EVIDENCE_SETS_EMPTY_LIST = 'No saved evidence sets for this case yet.';

export const P109_EVIDENCE_SETS_LOADING = 'Loading saved sets…';

export const P109_EVIDENCE_SETS_ERROR_GENERIC = 'Could not load saved sets. Try again.';

export const P109_EVIDENCE_SETS_NO_SESSION = 'Case Engine session is required.';

export const P109_EVIDENCE_SETS_NAME_LABEL = 'Name for this saved grouping';

export const P109_EVIDENCE_SETS_NAME_PLACEHOLDER = 'Enter a name for this saved grouping';

export const P109_EVIDENCE_SETS_CREATE_BUTTON = 'Create saved set from current selection';

export const P109_EVIDENCE_SETS_CREATE_SECTION_ARIA_LABEL = 'Create a new saved grouping from session selection';

export const P109_EVIDENCE_SETS_CREATE_DISABLED_NO_SELECTION =
	'Select at least one timeline row or file elsewhere in this case before creating a saved grouping.';

export const P109_EVIDENCE_SETS_SELECTION_COUNTS = (timeline: number, files: number) =>
	`Selected: ${timeline} timeline, ${files} file${files === 1 ? '' : 's'}`;

export const P109_EVIDENCE_SETS_REFRESH = 'Reload list';

/**
 * P109-05 — Unified audit line from Case Engine `created_at` / `created_by` (display only; no extra contract).
 */
export function P109_EVIDENCE_SET_AUDIT_ATTRIBUTION_LINE(savedAtDisplay: string, savedByUserId: string): string {
	return `Saved at: ${savedAtDisplay} · Saved by (user id): ${savedByUserId}`;
}

export const P109_EVIDENCE_SETS_CREATE_SUCCESS = (name: string, itemCount: number) =>
	`Saved “${name}” (${itemCount} item${itemCount === 1 ? '' : 's'}). Session selection was cleared so you do not duplicate the same picks by mistake.`;

export const P109_EVIDENCE_SETS_CREATE_FAILED = 'Could not save set. Your session selection is unchanged. Try again.';

/** P109-04 / P109-05 — Read-only detail (saved membership inspection). */

export const P109_EVIDENCE_SET_DETAIL_PAGE_TITLE = 'Saved evidence set';

export const P109_EVIDENCE_SET_DETAIL_READONLY_BADGE = 'Read-only inspection';

export const P109_EVIDENCE_SET_DETAIL_SUPPORTING_COPY =
	'What Case Engine stored for this explicit grouping. Not a finding or standalone write-up. The Timeline is authoritative; files are supporting; this screen is not.';

export const P109_EVIDENCE_SET_DETAIL_AUDIT_LABEL = 'Audit (from Case Engine)';

export const P109_EVIDENCE_SET_DETAIL_BACK = 'Back to evidence sets';

export const P109_EVIDENCE_SET_DETAIL_LIST_LINK_TITLE = 'Open read-only saved set detail';

export const P109_EVIDENCE_SET_DETAIL_LOADING = 'Loading saved set…';

export const P109_EVIDENCE_SET_DETAIL_NOT_FOUND = 'This saved set was not found for this case.';

export const P109_EVIDENCE_SET_DETAIL_ERROR = 'Could not load this saved set. Try again.';

export const P109_EVIDENCE_SET_DETAIL_NO_SESSION = 'Case Engine session is required.';

export const P109_EVIDENCE_SET_DETAIL_SECTION_TIMELINE = 'Timeline entry references';

export const P109_EVIDENCE_SET_DETAIL_SECTION_FILES = 'File references';

export const P109_EVIDENCE_SET_DETAIL_TIMELINE_ROW = (entryId: string) => `Timeline entry id: ${entryId}`;

export const P109_EVIDENCE_SET_DETAIL_FILE_ROW = (fileId: string) => `File id: ${fileId}`;

export const P109_EVIDENCE_SET_DETAIL_SECTION_EMPTY = 'None in this set.';

export const P109_EVIDENCE_SET_DETAIL_IDS_ONLY_NOTE =
	'Only the saved record identifiers are listed here. Open Timeline or Files for full entry text and filenames.';
