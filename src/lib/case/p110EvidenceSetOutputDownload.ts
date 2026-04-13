/**
 * P110-04 — Deterministic plain-text download filename (no templating engine).
 * Uses case id + evidence set id with safe segment sanitization.
 */

export function safeFilenameSegment(raw: string): string {
	const s = String(raw ?? '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
	return s.length > 0 ? s : 'id';
}

/**
 * Stable `.txt` basename: `evidence-set-output--case-<caseId>--set-<setId>.txt`
 */
export function buildDeterministicPlainTextFilename(caseId: string, setId: string): string {
	return `evidence-set-output--case-${safeFilenameSegment(caseId)}--set-${safeFilenameSegment(setId)}.txt`;
}

/**
 * Browser-safe plain-text download (Blob + temporary anchor). Same bytes as copy path.
 */
export function triggerPlainTextDownload(text: string, filename: string): void {
	const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}
