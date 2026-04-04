/**
 * P40-05B — Build modal body for Case File extracted text (shared by Extract + View paths).
 */
export type CaseFileTextPayload = {
	status: string;
	message: string | null;
	extracted_text: string;
};

/**
 * Human-readable modal content aligned with GET /files/:id/text fields.
 * Empty extracted body uses “(No text)”; non-EXTRACTED statuses prefix message when present.
 */
export function buildCaseFileExtractedTextModalBody(data: CaseFileTextPayload): string {
	const raw = data.extracted_text ?? '';
	const body = raw.trim() === '' ? '(No text)' : raw;
	if (data.status !== 'EXTRACTED' && data.message) {
		return `[${data.status}] ${data.message}\n\n${body}`;
	}
	if (data.status === 'EXTRACTED' && raw.trim() === '' && (data.message ?? '').trim()) {
		return `${data.message}\n\n${body}`;
	}
	return body;
}
