import { describe, expect, it } from 'vitest';
import {
	buildAuthoritativeTimelineContextPreview,
	buildSupportingFileContextPreview,
	buildSupportingTaskContextPreview,
	firstLineSnippetFromEntryText
} from './synthesisNavigationContextPreview';

describe('firstLineSnippetFromEntryText (P97-04)', () => {
	it('returns truncated single-line snippet without interpretation', () => {
		const long = 'a'.repeat(200);
		expect(firstLineSnippetFromEntryText(`  \n  ${long}  `, 20).length).toBeLessThanOrEqual(20);
		expect(firstLineSnippetFromEntryText('', 20)).toBe('');
	});
});

describe('buildAuthoritativeTimelineContextPreview (P97-04)', () => {
	it('uses occurred_at, type, and first text line only', () => {
		const p = buildAuthoritativeTimelineContextPreview({
			occurred_at: '2024-01-15T12:00:00.000Z',
			type: 'note',
			text_original: 'First line\nSecond line'
		});
		expect(p.headline).toBe('Official timeline entry');
		expect(p.lines.some((l) => l.includes('Type'))).toBe(true);
		expect(p.lines.some((l) => l.includes('Text'))).toBe(true);
	});
});

describe('buildSupportingTaskContextPreview (P97-04)', () => {
	it('labels supporting operational task and includes status', () => {
		const p = buildSupportingTaskContextPreview({
			title: 'Follow up witness',
			status: 'open',
			createdAt: '2024-01-10T10:00:00.000Z',
			deletedAt: null
		});
		expect(p.headline).toContain('Operational task');
		expect(p.headline).toContain('supporting');
		expect(p.lines[0]).toContain('Follow up witness');
		expect(p.lines.some((l) => l.includes('Status'))).toBe(true);
	});

	it('notes soft-deleted row without implying Timeline authority', () => {
		const p = buildSupportingTaskContextPreview({
			title: 'X',
			status: 'open',
			createdAt: '2024-01-10T10:00:00.000Z',
			deletedAt: '2024-02-01T10:00:00.000Z'
		});
		expect(p.lines.some((l) => l.toLowerCase().includes('removed'))).toBe(true);
	});
});

describe('buildSupportingFileContextPreview (P97-04)', () => {
	it('distinguishes extracted_text reference headline from file row', () => {
		const base = {
			original_filename: 'report.pdf',
			uploaded_at: '2024-01-10T10:00:00.000Z',
			mime_type: 'application/pdf'
		};
		const fileRef = buildSupportingFileContextPreview(base, 'case_file');
		const extRef = buildSupportingFileContextPreview(base, 'extracted_text');
		expect(fileRef.headline).not.toEqual(extRef.headline);
		expect(extRef.headline).toContain('extracted text');
	});
});
