/**
 * P40-05A — Case Files text extraction: supported types label + client-side extractability hint.
 * Mirrors backend `POST /files/:fileId/extract-text` in `DetectiveCaseEngine/src/routes/files.ts`.
 */
export const CASE_FILES_SUPPORTED_EXTRACT_TYPES_LABEL = 'txt, csv, log, json, pdf, docx';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Return the lowercase extension from filename, falling back to MIME subtype. */
export function caseFileExtLabel(filename: string, mimeType: string | null): string {
	const dot = filename.lastIndexOf('.');
	if (dot !== -1 && dot < filename.length - 1) {
		return filename.slice(dot + 1).toLowerCase();
	}
	if (mimeType) {
		const sub = mimeType.split('/')[1]?.split(';')[0]?.toLowerCase();
		if (sub) return sub;
	}
	return '?';
}

/** True when the Case Engine extract-text route is expected to handle this file (not authoritative). */
export function isCaseFileLikelyExtractable(filename: string, mimeType: string | null): boolean {
	const dot = filename.lastIndexOf('.');
	const ext = dot !== -1 ? filename.slice(dot + 1).toLowerCase() : '';
	if (['txt', 'csv', 'log', 'json', 'pdf', 'docx'].includes(ext)) return true;
	if (mimeType?.startsWith('text/') || mimeType === 'application/pdf' || mimeType === DOCX_MIME) {
		return true;
	}
	return false;
}
