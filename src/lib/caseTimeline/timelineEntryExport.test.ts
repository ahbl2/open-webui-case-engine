import { describe, it, expect } from 'vitest';
import {
	buildTimelineEntryExportPayload,
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

	it('buildTimelineEntryExportPayload txt includes metadata and body', () => {
		const { content, ext, filename } = buildTimelineEntryExportPayload(
			baseEntry,
			'Shown body',
			'txt'
		);
		expect(ext).toBe('txt');
		expect(content).toContain('Entry ID: te-1');
		expect(content).toContain('Case ID: c-1');
		expect(content).toContain('Type: surveillance');
		expect(content).toContain('Location: Main St');
		expect(content).toContain('Shown body');
		expect(filename).toBe('case-timeline-entry-te-1-surveillance.txt');
	});

	it('buildTimelineEntryExportPayload md uses markdown header', () => {
		const { content, ext } = buildTimelineEntryExportPayload(baseEntry, 'Body', 'md');
		expect(ext).toBe('md');
		expect(content.startsWith('# Timeline entry')).toBe(true);
		expect(content).toContain('Body');
	});

	it('omits Location line when empty', () => {
		const e = { ...baseEntry, location_text: null };
		const { content } = buildTimelineEntryExportPayload(e, 'x', 'txt');
		expect(content).not.toMatch(/^Location:/m);
	});

	it('timelineEntryExportFilename is stable', () => {
		expect(timelineEntryExportFilename('id', 'note', 'txt')).toBe('case-timeline-entry-id-note.txt');
	});
});
