/**
 * P110-02 — Read-only output preview (resolved records from Case Engine expansion).
 * P110-03 — Ordering is enforced by `p110EvidenceSetOutputComposition` (timeline / files / membership).
 * P110-04 — Copy/download plain text output.
 * P110-05 — Centralized operator copy; traceability and non-authoritative framing (no report/export-engine drift).
 */

export const P110_OUTPUT_PREVIEW_SECTION_TITLE = 'Read-only output preview';

export const P110_OUTPUT_PREVIEW_SECTION_SUPPORTING =
	'Plain text preview from Case Engine expansion. Deterministic ordering; explicit saved membership only; traceable to source rows. Not authoritative over Timeline or Files. Plain text copy, .txt download, and DOCX/PDF file download use the same packaged content as this preview.';

export const P110_OUTPUT_PREVIEW_ERROR_GENERIC = 'Could not load resolved preview. Try again.';

/** Timeline is authoritative in the case; labels here are source-record pointers, not a separate official record product. */
export const P110_OUTPUT_PREVIEW_TIMELINE_HEADING = 'Timeline entries (source records)';

export const P110_OUTPUT_PREVIEW_FILES_HEADING = 'File references (supporting)';

export const P110_OUTPUT_PREVIEW_EMPTY_SECTION = 'None in this set.';

export const P110_OUTPUT_PREVIEW_TIMELINE_META_LINE = (
	occurredAtDisplay: string,
	entryType: string,
	sourceId: string,
	createdBy: string,
	createdAtDisplay: string
) =>
	`Occurred: ${occurredAtDisplay} · Type: ${entryType} · Entry id: ${sourceId} · Created by (user id): ${createdBy} · Record created: ${createdAtDisplay}`;

export const P110_OUTPUT_PREVIEW_FILE_META_LINE = (
	filename: string,
	sourceId: string,
	mime: string,
	uploadedAtDisplay: string,
	createdAtDisplay: string
) =>
	`File: ${filename} · File id: ${sourceId} · Type: ${mime} · Uploaded: ${uploadedAtDisplay} · Record created: ${createdAtDisplay}`;

/** P110-05 — Traceability block (explicit ids; no validation or sign-off framing). */

export const P110_OUTPUT_TRACEABILITY_LABEL = 'Traceability';

export const P110_OUTPUT_TRACEABILITY_CASE_SET_LINE = (caseId: string, setId: string) =>
	`Case id: ${caseId} · Evidence set id: ${setId}`;

export const P110_OUTPUT_TRACEABILITY_NON_AUTHORITY =
	'Saved grouping only. Not a finding; not a substitute for Timeline; not authoritative over Timeline or Files.';

export const P110_OUTPUT_TRACEABILITY_PLAIN_TEXT_NOTE =
	'Plain text copy and .txt download match this preview. DOCX and PDF are the same packaged content from Case Engine in different file types.';

export const P110_OUTPUT_VERSION_LINE = (compositionRulesVersion: number) =>
	`Composition rules version: ${compositionRulesVersion} (ordering only).`;

/** P110-04 — Read-only output actions (plain text only). */

export const P110_OUTPUT_COPY_BUTTON = 'Copy plain text output';

export const P110_OUTPUT_DOWNLOAD_BUTTON = 'Download plain text (.txt)';

export const P110_OUTPUT_COPY_SUCCESS = 'Plain text output copied to clipboard.';

export const P110_OUTPUT_COPY_FAILED = 'Could not copy plain text. Try download or copy manually.';

export const P110_OUTPUT_DOWNLOAD_SUCCESS = 'Plain text download started.';

export const P110_OUTPUT_DOWNLOAD_FAILED = 'Could not start plain text download. Try again.';
