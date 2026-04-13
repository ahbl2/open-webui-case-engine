/**
 * P40-05B — Build modal body for Case File extracted text (shared by Extract + View paths).
 * P104-02 — Non-EXTRACTED rows never present stored text as if it were a successful extraction;
 * when the server retained text for diagnostics, it is explicitly labeled (raw artifact ≠ extracted success).
 */
export type CaseFileTextPayload = {
	status: string;
	message: string | null;
	extracted_text: string;
};

/**
 * Human-readable modal content aligned with GET /files/:id/text fields.
 * EXTRACTED: body is extracted text (or “(No text)” when empty/whitespace).
 * Non-EXTRACTED: status + message first; optional stored text only under an explicit diagnostic banner.
 */
export function buildCaseFileExtractedTextModalBody(data: CaseFileTextPayload): string {
	const raw = data.extracted_text ?? '';
	const trimmed = raw.trim();

	if (data.status === 'EXTRACTED') {
		const body = trimmed === '' ? '(No text)' : raw;
		if (trimmed === '' && (data.message ?? '').trim()) {
			return `${data.message}\n\n${body}`;
		}
		return body;
	}

	const msg = (data.message ?? '').trim() || 'No extracted text available for this status.';
	const head = `[${data.status}] ${msg}`;
	if (trimmed === '') {
		return head;
	}
	return `${head}\n\n---\nDiagnostic text (not a successful extraction; not interchangeable with raw file bytes):\n${raw}`;
}
