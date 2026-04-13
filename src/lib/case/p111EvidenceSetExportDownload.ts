/**
 * P111-04 — Binary download helper + deterministic filenames (matches Case Engine `exportAttachmentBasename`).
 */
import { safeFilenameSegment } from '$lib/case/p110EvidenceSetOutputDownload';

export function buildEvidenceSetExportDocxFilename(caseId: string, setId: string): string {
	return `case-${safeFilenameSegment(caseId)}_evidence-set-${safeFilenameSegment(setId)}.docx`;
}

export function buildEvidenceSetExportPdfFilename(caseId: string, setId: string): string {
	return `case-${safeFilenameSegment(caseId)}_evidence-set-${safeFilenameSegment(setId)}.pdf`;
}

/** Browser-safe download for arbitrary Blob (no content transformation). */
export function triggerBinaryDownload(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}
