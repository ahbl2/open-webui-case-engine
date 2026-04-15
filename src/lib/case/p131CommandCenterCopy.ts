/**
 * P131-01 — Operator Command Center surface copy (static strings only; no logic).
 */

export const P131_COMMAND_CENTER_SURFACE_TITLE = 'Command Center';

export const P131_COMMAND_CENTER_NAV_TITLE =
	'Cross-case visibility only. Read-only. Not a source of truth.';

export const P131_COMMAND_CENTER_INTRO_CROSS_CASE =
	'This surface shows cross-case visibility for operators. It is separate from any single case workspace.';

export const P131_COMMAND_CENTER_INTRO_READ_ONLY =
	'This surface is read-only. It does not create, change, or delete case records.';

export const P131_COMMAND_CENTER_INTRO_NO_MUTATION =
	'Nothing on this screen writes to Timeline, Notes, Workflow, Files, Entities, or Proposals.';

export const P131_COMMAND_CENTER_CORE_PRINCIPLE = 'Visibility without interpretation.';

export const P131_COMMAND_CENTER_BOUNDARY_TIMELINE =
	'Timeline is the authoritative case record in Case Engine.';

export const P131_COMMAND_CENTER_BOUNDARY_NOT_TRUTH =
	'Command Center is not a source of truth and does not interpret case data.';

export const P131_COMMAND_CENTER_BOUNDARY_NO_ACTIONS =
	'No case actions are available from this surface.';

export const P131_COMMAND_CENTER_SECTION_CASE_LIST_TITLE = 'Case List (Cross-case)';

export const P131_COMMAND_CENTER_SECTION_CASE_LIST_DESC =
	'Cases in your selected unit scope from Case Engine. Fields are shown as returned; ordering is by last Timeline occurred_at (newest first), which is explicit timestamp sorting only.';

export const P131_COMMAND_CENTER_SECTION_CASE_LIST_NOTE = 'Read-only, no interpretation.';

export const P131_COMMAND_CENTER_CASE_LIST_LOADING = 'Loading cases…';

export const P131_COMMAND_CENTER_CASE_LIST_EMPTY = 'No cases available.';

export const P131_COMMAND_CENTER_CASE_LIST_NO_TOKEN =
	'Case Engine session required. Sign in with a linked account to load cases.';

export const P131_COMMAND_CENTER_CASE_LIST_COL_NUMBER = 'Case number';

export const P131_COMMAND_CENTER_CASE_LIST_COL_TITLE = 'Title';

export const P131_COMMAND_CENTER_CASE_LIST_COL_UNIT = 'Unit';

export const P131_COMMAND_CENTER_CASE_LIST_COL_STATUS = 'Status';

export const P131_COMMAND_CENTER_CASE_LIST_COL_LAST_TIMELINE = 'Last Timeline (occurred_at)';

export const P131_COMMAND_CENTER_CASE_LIST_EMPTY_CELL = '—';

export const P131_COMMAND_CENTER_SECTION_ACTIVITY_TITLE = 'Activity Feed';

export const P131_COMMAND_CENTER_SECTION_ACTIVITY_DESC =
	'Audit activity from Case Engine for cases in your selected unit scope. Each line shows user, action type, case, and time as returned; ordering is by occurred_at (newest first), explicit timestamp sort only.';

export const P131_COMMAND_CENTER_SECTION_ACTIVITY_NOTE = 'Read-only, no interpretation.';

export const P131_COMMAND_CENTER_ACTIVITY_LOADING = 'Loading activity…';

export const P131_COMMAND_CENTER_ACTIVITY_EMPTY = 'No activity available.';

export const P131_COMMAND_CENTER_ACTIVITY_NO_TOKEN =
	'Case Engine session required. Sign in with a linked account to load activity.';

/** Sentence glue only; data values are shown verbatim from the API. */
export const P131_COMMAND_CENTER_ACTIVITY_SENTENCE_USER = 'User';

export const P131_COMMAND_CENTER_ACTIVITY_SENTENCE_PERFORMED = 'performed';

export const P131_COMMAND_CENTER_ACTIVITY_SENTENCE_ON_CASE = 'on Case';

export const P131_COMMAND_CENTER_ACTIVITY_SENTENCE_AT = 'at';

export const P131_COMMAND_CENTER_SECTION_WORKFLOW_TITLE = 'Workflow Snapshot';

export const P131_COMMAND_CENTER_SECTION_WORKFLOW_DESC =
	'Workflow item counts per case from Case Engine for your unit scope. Row order matches the Case List (last Timeline occurred_at, newest first). Status counts, when shown, use stored status values only.';

export const P131_COMMAND_CENTER_SECTION_WORKFLOW_NOTE = 'Read-only, no interpretation.';

export const P131_COMMAND_CENTER_WORKFLOW_LOADING = 'Loading workflow snapshot…';

export const P131_COMMAND_CENTER_WORKFLOW_EMPTY = 'No workflow items available.';

export const P131_COMMAND_CENTER_WORKFLOW_NO_TOKEN =
	'Case Engine session required. Sign in with a linked account to load workflow counts.';

/** Sentence: Case [identifier] — [n] workflow items */
export const P131_COMMAND_CENTER_WORKFLOW_ROW_LEAD = 'Case';

export const P131_COMMAND_CENTER_WORKFLOW_ROW_DASH = '—';

export const P131_COMMAND_CENTER_WORKFLOW_ROW_ITEMS_NOUN = 'workflow items';

export const P131_COMMAND_CENTER_NAV_INTENT_PLACEHOLDER =
	'Open a case from the Case List above by clicking a row (navigates to /case/:id).';

export const P131_COMMAND_CENTER_PLACEHOLDER_FUTURE_NOTE =
	'Future: read-only content for this section; no automatic navigation.';

export const P131_COMMAND_CENTER_PLACEHOLDER_ROW_LABEL = 'Placeholder row (no navigation)';

/** P132-03 — Command Center load failures: generic only (no permission vs system distinction). */
export const P132_COMMAND_CENTER_GENERIC_LOAD_ERROR =
	'Unable to load this section. Try again.';

/** P131.5-02 — Dashboard summary row (explicit counts only; no inferred analytics). */
export const P131_5_COMMAND_CENTER_SUMMARY_CASES_TITLE = 'Cases in Scope';

export const P131_5_COMMAND_CENTER_SUMMARY_CASES_SUB =
	'Count of case rows returned for the current unit scope';

export const P131_5_COMMAND_CENTER_SUMMARY_ACTIVITY_TITLE = 'Recent Activity Rows';

export const P131_5_COMMAND_CENTER_SUMMARY_ACTIVITY_SUB =
	'Count of activity rows returned for the current unit scope';

export const P131_5_COMMAND_CENTER_SUMMARY_WORKFLOW_TITLE = 'Workflow Items Visible';

export const P131_5_COMMAND_CENTER_SUMMARY_WORKFLOW_SUB =
	'Sum of per-case workflow item counts (same snapshot as below)';

export const P131_5_COMMAND_CENTER_SUMMARY_OPEN_TITLE = 'Open Cases';

export const P131_5_COMMAND_CENTER_SUMMARY_OPEN_SUB =
	'Cases whose status field is OPEN (explicit string match only)';

export const P131_5_COMMAND_CENTER_SUMMARY_NO_TOKEN_SUB =
	'Case Engine session required to load counts.';

/** P131.5-03 — Case List dashboard card header (factual; same ordering rule as P131-02). */
export const P131_5_COMMAND_CENTER_CASES_CARD_TITLE = 'Cases';

export const P131_5_COMMAND_CENTER_CASES_CARD_SUB =
	'Unit scope from Case Engine; ordering by last Timeline occurred_at (newest first), timestamp sort only.';

/** P131.5-04 — Activity / Workflow dashboard card headers (factual; ordering unchanged from P131-03/04). */
export const P131_5_COMMAND_CENTER_ACTIVITY_CARD_TITLE = 'Recent Activity';

export const P131_5_COMMAND_CENTER_ACTIVITY_CARD_SUB =
	'Audit events from Case Engine for your unit scope; ordered by occurred_at (newest first), timestamp sort only.';

export const P131_5_COMMAND_CENTER_WORKFLOW_CARD_TITLE = 'Workflow Snapshot';

export const P131_5_COMMAND_CENTER_WORKFLOW_CARD_SUB =
	'Per-case workflow item counts; row order follows the Case List (last Timeline occurred_at, newest first). Status counts use stored status values only.';
