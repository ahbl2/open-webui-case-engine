/**
 * P106-02 / P106-05 — Operator copy for case entities surfaces (supporting-only; Timeline authoritative).
 */

/** List panel `<h1>` — non-authoritative framing (see also nav label). */
export const P106_CASE_ENTITIES_LIST_HEADING = 'Supporting entities';

export const P106_CASE_ENTITIES_SUPPORTING_COPY =
	'Supporting records only. The Timeline is the official case record, not verified facts and not a substitute for Timeline entries.';

export const P106_CASE_ENTITIES_EMPTY_COPY =
	'No structured entities for this case yet. The Timeline remains the official record.';

export const P106_CASE_ENTITIES_LOADING = 'Loading…';

export const P106_CASE_ENTITIES_ERROR_GENERIC = 'Could not load entities. Try again.';

export const P106_CASE_ENTITIES_NO_SESSION = 'Case Engine session is required.';

export const P106_CASE_ENTITIES_RETIRED_LABEL = 'Retired';

/** P106-03 — Entity detail + explicit evidence links (read-only). */

export const P106_CASE_ENTITY_DETAIL_SUPPORTING_COPY =
	'Supporting record only. The Timeline is authoritative. This view is not verified fact or official chronology.';

export const P106_CASE_ENTITY_DETAIL_BACK_TO_LIST = 'Back to entities';

export const P106_CASE_ENTITY_DETAIL_LOADING = 'Loading entity…';

export const P106_CASE_ENTITY_DETAIL_ERROR_GENERIC = 'Could not load this entity. Try again.';

export const P106_CASE_ENTITY_DETAIL_NO_EVIDENCE =
	'No explicit evidence links are recorded for this entity. The Timeline remains the official case record.';

export const P106_CASE_ENTITY_DETAIL_ATTRIBUTES_HEADING = 'Attributes (literal values from Case Engine)';

export const P106_CASE_ENTITY_DETAIL_EVIDENCE_HEADING = 'Explicit evidence links (declared only)';

export const P106_CASE_ENTITY_DETAIL_LINK_TYPE_TIMELINE = 'Timeline entry';

export const P106_CASE_ENTITY_DETAIL_LINK_TYPE_FILE = 'Case file';

export const P106_CASE_ENTITY_DETAIL_TARGET_UNAVAILABLE = 'Unavailable';

/** Shown under unavailable targets (read-only; no navigation action). */
export const P106_CASE_ENTITY_EVIDENCE_UNAVAILABLE_NOTE = 'Not openable from here.';

/** P106-04 — Open linked record (Phase 103 navigation; one explicit target id). */

export const P106_CASE_ENTITY_OPEN_LINKED_RECORD = 'Open linked record';

export const P106_CASE_ENTITY_NAVIGATION_FAILED = 'Could not open that record. Try again.';
