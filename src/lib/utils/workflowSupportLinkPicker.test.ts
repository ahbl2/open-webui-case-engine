import { describe, it, expect } from 'vitest';
import {
	buildCaseFileSupportPickerRows,
	buildNotebookSupportPickerRows,
	buildTimelineSupportPickerRows,
	clipPickerSnippet,
	collapsePickerWhitespace,
	filterSupportLinkPickerRows
} from './workflowSupportLinkPicker';
import type { CaseFile, NotebookNote, TimelineEntry } from '$lib/apis/caseEngine';

describe('workflowSupportLinkPicker P60-08', () => {
	it('collapsePickerWhitespace normalizes runs of whitespace', () => {
		expect(collapsePickerWhitespace('  a \n\t b  ')).toBe('a b');
	});

	it('clipPickerSnippet adds ellipsis when trimming long text', () => {
		const s = 'word '.repeat(30);
		const out = clipPickerSnippet(s, 20);
		expect(out.endsWith('…')).toBe(true);
		expect(out.length).toBeLessThanOrEqual(20);
	});

	it('buildTimelineSupportPickerRows includes type, occurred context, and body teaser', () => {
		const entries: TimelineEntry[] = [
			{
				id: 'te-1',
				case_id: 'c1',
				occurred_at: '2024-06-01T14:30:00.000Z',
				created_at: '2024-06-02T10:00:00.000Z',
				created_by: 'u1',
				type: 'interview',
				location_text: 'Precinct 12',
				tags: ['witness'],
				text_original: 'Subject stated they left at noon.',
				text_cleaned: null,
				deleted_at: null
			}
		];
		const rows = buildTimelineSupportPickerRows(entries);
		expect(rows).toHaveLength(1);
		expect(rows[0].id).toBe('te-1');
		expect(rows[0].kind).toBe('TIMELINE_ENTRY');
		expect(rows[0].primaryLine).toContain('interview');
		expect(rows[0].primaryLine).toContain('2024');
		expect(rows[0].secondaryLine).toContain('Precinct 12');
		expect(rows[0].secondaryLine).toContain('witness');
		expect(rows[0].teaser).toContain('Subject');
		expect(rows[0].previewMeta).toContain('Occurred:');
		expect(rows[0].previewMeta).toContain('Entry ID: te-1');
		expect(rows[0].previewBody).toContain('noon');
		expect(rows[0].previewTitle).toContain('interview');
		expect(rows[0].previewTitle).toMatch(/\d{2}:\d{2}:\d{2}/);
	});

	it('buildTimelineSupportPickerRows surfaces version hint and time-first primary line', () => {
		const entries: TimelineEntry[] = [
			{
				id: 'entry-long-uuid-123456789',
				case_id: 'c1',
				occurred_at: '2024-06-01T14:30:00.000Z',
				created_at: '2024-06-01T14:30:00.000Z',
				created_by: 'u1',
				type: 'note',
				location_text: null,
				tags: [],
				text_original: 'Body.',
				text_cleaned: null,
				deleted_at: null,
				version_count: 2
			}
		];
		const rows = buildTimelineSupportPickerRows(entries);
		expect(rows[0].primaryLine).toContain(' · note');
		expect(rows[0].primaryLine).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
		expect(rows[0].secondaryLine).toContain('2 prior edits');
		expect(rows[0].secondaryLine).toContain('entry-lo…');
	});

	it('buildNotebookSupportPickerRows uses title, updated line, and body in preview', () => {
		const notes: NotebookNote[] = [
			{
				id: 42,
				case_id: 'c1',
				owner_user_id: 'u1',
				title: 'Lead follow-up',
				current_text: 'Call the desk sergeant.',
				created_at: '2024-01-01T00:00:00.000Z',
				created_by: 'u1',
				updated_at: '2024-01-02T15:00:00.000Z',
				updated_by: 'u2',
				updated_by_name: 'Jamie',
				deleted_at: null,
				deleted_by: null
			}
		];
		const rows = buildNotebookSupportPickerRows(notes);
		expect(rows[0].id).toBe('42');
		expect(rows[0].kind).toBe('NOTEBOOK_NOTE');
		expect(rows[0].primaryLine).toBe('Lead follow-up');
		expect(rows[0].secondaryLine).toContain('Jamie');
		expect(rows[0].teaser).toContain('sergeant');
		expect(rows[0].previewMeta).toContain('Note ID: 42');
		expect(rows[0].previewBody).toContain('desk');
	});

	it('buildCaseFileSupportPickerRows carries filename, MIME, and extraction status from list payload', () => {
		const files: CaseFile[] = [
			{
				id: 'f-9',
				original_filename: 'report.pdf',
				mime_type: 'application/pdf',
				file_size_bytes: 2048,
				uploaded_by: 'u1',
				uploaded_at: '2024-03-10T12:00:00.000Z',
				tags: ['exhibit'],
				extraction_status: 'extracted'
			} as CaseFile
		];
		const rows = buildCaseFileSupportPickerRows(files);
		expect(rows[0].primaryLine).toBe('report.pdf');
		expect(rows[0].secondaryLine).toContain('application/pdf');
		expect(rows[0].secondaryLine).toContain('KB');
		expect(rows[0].teaser).toContain('exhibit');
		expect(rows[0].previewMeta).toContain('Extraction: extracted');
		expect(rows[0].previewBody).toContain('Open this file in Files');
	});
});

describe('workflowSupportLinkPicker P60-09 filter', () => {
	const sampleRows = buildTimelineSupportPickerRows([
		{
			id: 'a',
			case_id: 'c',
			occurred_at: '2024-06-01T14:30:00.000Z',
			created_at: '2024-06-01T14:30:00.000Z',
			created_by: 'u',
			type: 'witness',
			location_text: 'Dockside',
			tags: [],
			text_original: 'Blue van mentioned.',
			text_cleaned: null,
			deleted_at: null
		},
		{
			id: 'b',
			case_id: 'c',
			occurred_at: '2024-06-02T14:30:00.000Z',
			created_at: '2024-06-02T14:30:00.000Z',
			created_by: 'u',
			type: 'patrol',
			location_text: 'Highway 9',
			tags: [],
			text_original: 'Nothing observed.',
			text_cleaned: null,
			deleted_at: null
		}
	]);

	it('returns all rows for empty / whitespace query', () => {
		expect(filterSupportLinkPickerRows(sampleRows, '')).toEqual(sampleRows);
		expect(filterSupportLinkPickerRows(sampleRows, '  \n')).toEqual(sampleRows);
	});

	it('matches primary label case-insensitively', () => {
		const out = filterSupportLinkPickerRows(sampleRows, 'WITNESS');
		expect(out.map((r) => r.id)).toEqual(['a']);
	});

	it('matches secondary metadata and teaser text', () => {
		expect(filterSupportLinkPickerRows(sampleRows, 'dockside').map((r) => r.id)).toEqual(['a']);
		expect(filterSupportLinkPickerRows(sampleRows, 'blue van').map((r) => r.id)).toEqual(['a']);
	});

	it('returns empty when nothing matches', () => {
		expect(filterSupportLinkPickerRows(sampleRows, 'zzyzx')).toEqual([]);
	});
});
