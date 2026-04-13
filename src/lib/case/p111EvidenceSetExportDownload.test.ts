import { afterEach, describe, it, expect, vi } from 'vitest';
import {
	buildEvidenceSetExportDocxFilename,
	buildEvidenceSetExportPdfFilename,
	triggerBinaryDownload
} from './p111EvidenceSetExportDownload';

describe('p111EvidenceSetExportDownload', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('matches deterministic filename pattern (no timestamps)', () => {
		expect(buildEvidenceSetExportDocxFilename('case-1', 'set-2')).toBe('case-case-1_evidence-set-set-2.docx');
		expect(buildEvidenceSetExportPdfFilename('case-1', 'set-2')).toBe('case-case-1_evidence-set-set-2.pdf');
	});

	it('triggerBinaryDownload uses object URL and anchor click (no blob mutation)', () => {
		const click = vi.fn();
		const remove = vi.fn();
		const anchor = { href: '', download: '', click, remove };
		const createElement = vi.fn(() => anchor);
		const appendChild = vi.fn();
		vi.stubGlobal('document', { createElement, body: { appendChild } });
		const createObjectURL = vi.fn(() => 'blob:x');
		const revokeObjectURL = vi.fn();
		vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
		const blob = new Blob([new Uint8Array([9])], { type: 'application/octet-stream' });
		triggerBinaryDownload(blob, 'case-a_evidence-set-b.docx');
		expect(createObjectURL).toHaveBeenCalledWith(blob);
		expect(anchor.download).toBe('case-a_evidence-set-b.docx');
		expect(appendChild).toHaveBeenCalledWith(anchor);
		expect(click).toHaveBeenCalledTimes(1);
		expect(remove).toHaveBeenCalledTimes(1);
		expect(revokeObjectURL).toHaveBeenCalledWith('blob:x');
	});
});
