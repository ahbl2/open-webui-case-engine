/**
 * P40-05A — Case Files extraction support hints (docx + existing types).
 */
import { describe, it, expect } from 'vitest';
import {
	CASE_FILES_SUPPORTED_EXTRACT_TYPES_LABEL,
	caseFileExtLabel,
	isCaseFileLikelyExtractable
} from './caseFilesExtractSupport';

describe('caseFilesExtractSupport (P40-05A)', () => {
	it('label lists docx with other supported types', () => {
		expect(CASE_FILES_SUPPORTED_EXTRACT_TYPES_LABEL).toContain('docx');
		expect(CASE_FILES_SUPPORTED_EXTRACT_TYPES_LABEL).toContain('pdf');
	});

	it('isCaseFileLikelyExtractable is true for .docx and Word MIME', () => {
		expect(isCaseFileLikelyExtractable('memo.DOCX', null)).toBe(true);
		expect(
			isCaseFileLikelyExtractable('unnamed', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
		).toBe(true);
	});

	it('isCaseFileLikelyExtractable stays true for txt/csv/log/json/pdf and text/*', () => {
		expect(isCaseFileLikelyExtractable('a.txt', null)).toBe(true);
		expect(isCaseFileLikelyExtractable('x.csv', null)).toBe(true);
		expect(isCaseFileLikelyExtractable('y.log', null)).toBe(true);
		expect(isCaseFileLikelyExtractable('z.json', null)).toBe(true);
		expect(isCaseFileLikelyExtractable('p.pdf', null)).toBe(true);
		expect(isCaseFileLikelyExtractable('readme', 'text/plain')).toBe(true);
	});

	it('isCaseFileLikelyExtractable is false for common unsupported extensions', () => {
		expect(isCaseFileLikelyExtractable('old.doc', null)).toBe(false);
		expect(isCaseFileLikelyExtractable('x.zip', null)).toBe(false);
	});

	it('caseFileExtLabel falls back to mime subtype', () => {
		expect(caseFileExtLabel('noext', 'application/pdf')).toBe('pdf');
	});
});
