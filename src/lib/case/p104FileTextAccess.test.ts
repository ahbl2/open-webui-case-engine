/**
 * P104-02 — File text access normalization (explicit states; no raw/extracted conflation).
 */
import { describe, it, expect, vi } from 'vitest';
import { buildCaseSynthesisReadModel } from '$lib/case/caseSynthesisReadModel';
import type { CaseFile, TimelineEntry } from '$lib/apis/caseEngine';
import type { CaseEngineCaseTask } from '$lib/apis/caseEngine/caseTasksApi';
import { isCaseFileExtractedTextUsable } from '$lib/case/p104FileTextAccess';

function file(partial: Partial<CaseFile> & Pick<CaseFile, 'id'>): CaseFile {
	return {
		original_filename: 'a.pdf',
		mime_type: 'application/pdf',
		file_size_bytes: 1,
		uploaded_by: 'u1',
		uploaded_at: '2025-01-01T00:00:00.000Z',
		...partial
	} as CaseFile;
}

describe('isCaseFileExtractedTextUsable (P104-02)', () => {
	it('true only for EXTRACTED with non-whitespace text', () => {
		expect(isCaseFileExtractedTextUsable('EXTRACTED', 'hello')).toBe(true);
		expect(isCaseFileExtractedTextUsable('EXTRACTED', '  x  ')).toBe(true);
	});

	it('false for non-EXTRACTED even when stored text is non-empty', () => {
		expect(isCaseFileExtractedTextUsable('FAILED', 'diagnostic')).toBe(false);
		expect(isCaseFileExtractedTextUsable('ERROR', 'partial')).toBe(false);
	});

	it('false for EXTRACTED with empty or whitespace-only text', () => {
		expect(isCaseFileExtractedTextUsable('EXTRACTED', '')).toBe(false);
		expect(isCaseFileExtractedTextUsable('EXTRACTED', '   \n')).toBe(false);
		expect(isCaseFileExtractedTextUsable('EXTRACTED', null)).toBe(false);
	});
});

describe('buildCaseSynthesisReadModel includeFileExtractedText (P104-02)', () => {
	it('does not promote non-EXTRACTED stored text into extracted_text supporting rows', async () => {
		const listTimeline = vi.fn(async () => [] as TimelineEntry[]);
		const listTasks = vi.fn(async () => [] as CaseEngineCaseTask[]);
		const listFiles = vi.fn(async () => [file({ id: 'f1' })]);
		const getFileText = vi.fn(async () => ({
			status: 'FAILED',
			extracted_text: 'should not appear as successful extraction'
		}));

		const m = await buildCaseSynthesisReadModel('case-x', 'tok', {
			generatedAtIso: '2026-01-01T00:00:00.000Z',
			includeFileExtractedText: true,
			deps: { listTimeline, listTasks, listFiles, getFileText }
		});

		expect(
			m.supporting_context.filter((s) => s.source_type === 'extracted_text')
		).toHaveLength(0);
		expect(m.supporting_context.some((s) => s.source_type === 'file' && s.source_id === 'f1')).toBe(
			true
		);
	});

	it('includes extracted_text row only when status is EXTRACTED and text is usable', async () => {
		const listTimeline = vi.fn(async () => [] as TimelineEntry[]);
		const listTasks = vi.fn(async () => [] as CaseEngineCaseTask[]);
		const listFiles = vi.fn(async () => [file({ id: 'f2' })]);
		const getFileText = vi.fn(async () => ({
			status: 'EXTRACTED',
			extracted_text: 'official body'
		}));

		const m = await buildCaseSynthesisReadModel('case-y', 'tok', {
			generatedAtIso: '2026-01-01T00:00:00.000Z',
			includeFileExtractedText: true,
			deps: { listTimeline, listTasks, listFiles, getFileText }
		});

		const ext = m.supporting_context.filter((s) => s.source_type === 'extracted_text');
		expect(ext).toHaveLength(1);
		expect(ext[0]!.source_id).toBe('f2');
		expect(ext[0]!.reference_text).toBe('official body');
	});
});
