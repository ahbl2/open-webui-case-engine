import { describe, it, expect } from 'vitest';
import { buildPlainTextPdfBytes } from './plainTextReportPdf';

describe('plainTextReportPdf', () => {
	it('buildPlainTextPdfBytes returns a PDF with expected header', async () => {
		const bytes = await buildPlainTextPdfBytes('Timeline entry\nLine two');
		expect(bytes.length).toBeGreaterThan(100);
		const head = new TextDecoder('latin1').decode(bytes.slice(0, 5));
		expect(head).toBe('%PDF-');
	});

	it('handles multiple paragraphs', async () => {
		const bytes = await buildPlainTextPdfBytes('A\n\nB');
		const head = new TextDecoder('latin1').decode(bytes.slice(0, 5));
		expect(head).toBe('%PDF-');
	});
});
