/**
 * P39-05 — Timeline composer text import helpers.
 *
 * Provides file-type support checking and user messaging for the Timeline
 * composer import feature. Text extraction itself is delegated to
 * `extractContentFromFile` from `$lib/utils` (client-side only; no
 * backend upload or persistent attachment record is created).
 *
 * Supported file types mirror what `extractContentFromFile` handles:
 *   - PDF (text layer, via pdfjs)
 *   - DOCX (via mammoth)
 *   - Plain-text files: .txt, .md, .csv, .json, .js, .ts, .css,
 *     .html, .xml, .yaml, .yml, .rtf, and any text/* MIME type
 *
 * Image files are NOT supported (client-side OCR is out of scope;
 * backend OCR is not used in this ticket to avoid backend contract changes).
 *
 * Extracted text is appended to composerDraft.text_original using the
 * same appendTranscriptToComposerText helper as P39-04 dictation.
 */

export type TimelineImportState = 'idle' | 'processing' | 'error';

/**
 * Accept attribute string for the hidden file input.
 * Limits the OS file picker to supported types (advisory; not enforced).
 */
export const TIMELINE_IMPORT_ACCEPT =
	'.txt,.md,.csv,.json,.xml,.yaml,.yml,.rtf,.html,.htm,.pdf,.docx';

const SUPPORTED_EXTENSIONS = new Set([
	'.txt',
	'.md',
	'.csv',
	'.json',
	'.js',
	'.ts',
	'.css',
	'.html',
	'.htm',
	'.xml',
	'.yaml',
	'.yml',
	'.rtf',
	'.pdf',
	'.docx'
]);

const SUPPORTED_MIME_TYPES = new Set([
	'application/pdf',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
	// text/* handled as prefix check below
]);

function getFileExtension(filename: string): string {
	const dot = filename.lastIndexOf('.');
	return dot === -1 ? '' : filename.substring(dot).toLowerCase();
}

/**
 * Returns true if the file is likely extractable client-side.
 * Mirrors the type checks in `extractContentFromFile` without the
 * binary-fallback path (which would return garbled data for images).
 */
export function isTimelineImportFileSupported(file: {
	name: string;
	type: string;
}): boolean {
	const ext = getFileExtension(file.name);
	const type = file.type || '';
	if (SUPPORTED_EXTENSIONS.has(ext)) return true;
	if (SUPPORTED_MIME_TYPES.has(type)) return true;
	if (type.startsWith('text/')) return true;
	return false;
}

/**
 * Returns a user-facing message explaining why the file cannot be imported.
 */
export function unsupportedTimelineImportMessage(file: { name: string }): string {
	return `"${file.name}" is not supported for text extraction. Use a PDF, Word document (.docx), or plain text file (.txt, .md, .csv, .json).`;
}
