/**
 * P107-05 — Read-only entity audit copy (supporting-only; literal Case Engine fields; no authority lift).
 */

export const P107_AUDIT_SECTION_HEADING = 'Record metadata (read-only)';

export const P107_AUDIT_NOTE =
	'These fields come from Case Engine as stored. They show who created or changed this supporting record and when. They do not change Timeline authority, imply relevance, or add official weight.';

export const P107_AUDIT_CREATED_AT = 'Created at';

export const P107_AUDIT_CREATED_BY = 'Created by';

export const P107_AUDIT_UPDATED_AT = 'Last updated at';

export const P107_AUDIT_UPDATED_BY = 'Last updated by';

export const P107_AUDIT_RETIRED_AT = 'Retired at';

export const P107_AUDIT_RETIRED_BY = 'Retired by';

/** List row: surfaces existing `updated_at` from the list read only (no client synthesis). */
export const P107_AUDIT_LIST_LAST_UPDATED_LABEL = 'Last updated (Case Engine):';
