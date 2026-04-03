/**
 * P38-04 — Case Files drag/drop contract (file-type gate + same upload API as picker).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dataTransferHasFiles } from './caseFilesDrop';

function mockDT(types: string[]): Pick<DataTransfer, 'types'> {
	return {
		types: types as unknown as DOMStringList
	};
}

describe('dataTransferHasFiles', () => {
	it('returns true when types include Files', () => {
		expect(dataTransferHasFiles(mockDT(['Files']) as DataTransfer)).toBe(true);
		expect(dataTransferHasFiles(mockDT(['text/plain', 'Files']) as DataTransfer)).toBe(true);
	});

	it('returns false when Files is absent', () => {
		expect(dataTransferHasFiles(mockDT(['text/plain']) as DataTransfer)).toBe(false);
		expect(dataTransferHasFiles(mockDT([]) as DataTransfer)).toBe(false);
	});

	it('returns false for null/undefined', () => {
		expect(dataTransferHasFiles(null)).toBe(false);
		expect(dataTransferHasFiles(undefined)).toBe(false);
	});
});

describe('CaseFilesTab.svelte — P38-04 upload path parity', () => {
	const tabPath = join(process.cwd(), 'src/lib/components/case/CaseFilesTab.svelte');

	it('drop handler uses dataTransferHasFiles and uploadCaseFile (same API as picker)', () => {
		const src = readFileSync(tabPath, 'utf8');
		expect(src).toContain('dataTransferHasFiles');
		expect(src).toContain('async function handleDroppedFiles');
		expect(src).toContain('await uploadCaseFile(caseId, file, token)');
		expect(src).toContain('onFilesZoneDrop');
		expect(src).toContain('onFilesZoneDragOver');
		expect(src).toContain('data-testid="case-files-upload-dropzone"');
	});
});
