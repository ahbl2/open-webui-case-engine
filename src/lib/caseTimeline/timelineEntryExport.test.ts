import { describe, it, expect } from 'vitest';
import {
	buildTimelineEntryExportPayload,
	buildTimelineEntryTxtDocument,
	safeTimelineExportSlug,
	timelineEntryExportFilename
} from './timelineEntryExport';
import type { TimelineEntry } from '$lib/apis/caseEngine';

const baseEntry: TimelineEntry = {
	id: 'te-1',
	case_id: 'c-1',
	occurred_at: '2026-01-01T12:00:00Z',
	created_at: '2026-01-02T08:00:00Z',
	created_by: 'u1',
	type: 'surveillance',
	location_text: 'Main St',
	tags: [],
	text_original: 'Original line',
	text_cleaned: null,
	deleted_at: null
};

describe('timelineEntryExport', () => {
	it('safeTimelineExportSlug normalizes type', () => {
		expect(safeTimelineExportSlug('surveillance')).toBe('surveillance');
		expect(safeTimelineExportSlug('Note!')).toBe('note');
	});

	it('buildTimelineEntryTxtDocument matches txt export payload content', () => {
		const doc = buildTimelineEntryTxtDocument(baseEntry, 'Shown body');
		const { content } = buildTimelineEntryExportPayload(baseEntry, 'Shown body', 'txt');
		expect(doc).toBe(content);
		expect(doc).toContain('Entry ID: te-1');
		expect(doc).toContain('Case ID: c-1');
		expect(doc).toContain('Type: surveillance');
		expect(doc).toContain('Location: Main St');
		expect(doc).toContain('Shown body');
	});

	it('buildTimelineEntryExportPayload txt filename is stable', () => {
		const { ext, filename } = buildTimelineEntryExportPayload(baseEntry, 'Shown body', 'txt');
		expect(ext).toBe('txt');
		expect(filename).toBe('case-timeline-entry-te-1-surveillance.txt');
	});

	it('omits Location line when empty', () => {
		const e = { ...baseEntry, location_text: null };
		const { content } = buildTimelineEntryExportPayload(e, 'x', 'txt');
		expect(content).not.toMatch(/^Location:/m);
	});

	it('timelineEntryExportFilename supports pdf extension', () => {
		expect(timelineEntryExportFilename('id', 'note', 'txt')).toBe('case-timeline-entry-id-note.txt');
		expect(timelineEntryExportFilename('id', 'note', 'pdf')).toBe('case-timeline-entry-id-note.pdf');
	});
});
