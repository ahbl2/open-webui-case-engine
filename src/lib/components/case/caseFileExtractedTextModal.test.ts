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

	it('matches View path: non-EXTRACTED status prefixes message', () => {
		expect(
			buildCaseFileExtractedTextModalBody({
				status: 'ERROR',
				message: 'PDF extraction failed',
				extracted_text: ''
			})
		).toBe('[ERROR] PDF extraction failed\n\n(No text)');
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
