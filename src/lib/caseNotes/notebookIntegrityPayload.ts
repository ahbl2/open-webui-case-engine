/**
 * P31-02: Build Case Engine notebook write payloads with optional `integrity_baseline_text`
 * for P31-01 server-side commit integrity (Detective Case Engine).
 */
export type NotebookWritePayload = {
	title: string;
	text: string;
	expected_updated_at?: string;
	integrity_baseline_text?: string;
};

export function mergeNotebookWritePayload(
	base: { title: string; text: string; expected_updated_at?: string | undefined },
	integrityBaselineText: string | null
): NotebookWritePayload {
	const textTrim = base.text.trim();
	const out: NotebookWritePayload = {
		title: base.title,
		text: base.text
	};
	if (base.expected_updated_at) {
		out.expected_updated_at = base.expected_updated_at;
	}
	const b = integrityBaselineText?.trim();
	if (b && b !== textTrim) {
		out.integrity_baseline_text = b;
	}
	return out;
}
