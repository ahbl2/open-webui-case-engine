/**
 * P111-04 — Operator-facing strings for DOCX/PDF export actions (no templating).
 * P112-02 — Attribution + non-authority reinforcement (deterministic copy only).
 * P112-05 — Surface-wide non-authority wording (same routes; no behavior change).
 */

export const P111_EXPORT_DOCX_BUTTON = 'Download DOCX file';

export const P111_EXPORT_PDF_BUTTON = 'Download PDF file';

/** Adjacent helper: same deterministic preview below; Case Engine file download only; non-authoritative. */
export const P112_EXPORT_FROM_PREVIEW_HELPER =
	'DOCX and PDF request the same deterministic output shown below from Case Engine as a file. Browser file download only; read-only; not stored in the case and not authoritative over Timeline.';

export const P111_EXPORT_LOADING_DOCX = 'Requesting DOCX file from Case Engine…';

export const P111_EXPORT_LOADING_PDF = 'Requesting PDF file from Case Engine…';

export const P111_EXPORT_SUCCESS_DOCX =
	'DOCX file download started. Read-only packaged file; not added to the case.';

export const P111_EXPORT_SUCCESS_PDF =
	'PDF file download started. Read-only packaged file; not added to the case.';

/** Format-specific failure line (detail message may follow from Case Engine). */
export const P112_EXPORT_FAILED_DOCX = 'DOCX file download did not complete.';

export const P112_EXPORT_FAILED_PDF = 'PDF file download did not complete.';

/** When error object has no message (should be rare). */
export const P112_EXPORT_FAILED_GENERIC = 'File download did not complete.';
