/**
 * P40-05B — Case file extracted text modal body formatting.
 */
import { describe, it, expect } from 'vitest';
import { buildCaseFileExtractedTextModalBody } from './caseFileExtractedTextModal';

describe('buildCaseFileExtractedTextModalBody (P40-05B)', () => {
	it('returns non-empty extracted text as-is', () => {
		expect(
			buildCaseFileExtractedTextModalBody({
				status: 'EXTRACTED',
				message: null,
				extracted_text: 'Hello from file'
			})
		).toBe('Hello from file');
	});

	it('matches View path: non-EXTRACTED status shows status + message only when no stored text', () => {
		expect(
			buildCaseFileExtractedTextModalBody({
				status: 'ERROR',
				message: 'PDF extraction failed',
				extracted_text: ''
			})
		).toBe('[ERROR] PDF extraction failed');
	});

	it('non-EXTRACTED with stored text labels it as diagnostic only (P104-02)', () => {
		expect(
			buildCaseFileExtractedTextModalBody({
				status: 'FAILED',
				message: 'Parser error',
				extracted_text: 'partial line'
			})
		).toBe(
			'[FAILED] Parser error\n\n---\nDiagnostic text (not a successful extraction; not interchangeable with raw file bytes):\npartial line'
		);
	});

	it('shows (No text) for EXTRACTED with empty string and optional advisory message after extract', () => {
		expect(
			buildCaseFileExtractedTextModalBody({
				status: 'EXTRACTED',
				message: 'DOCX contained no extractable text',
				extracted_text: ''
			})
		).toBe('DOCX contained no extractable text\n\n(No text)');
	});

	it('shows (No text) for EXTRACTED with whitespace-only extracted_text', () => {
		expect(
			buildCaseFileExtractedTextModalBody({
				status: 'EXTRACTED',
				message: null,
				extracted_text: '   \n\t  '
			})
		).toBe('(No text)');
	});
});
