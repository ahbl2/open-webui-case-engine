import { describe, expect, it } from 'vitest';
import { buildTimelineSummaryContext, mapTimelineSummaryKeyEvents } from './timelineSummary';
import type { TimelineEntry, TimelineIntelligenceSummaryResult } from '$lib/apis/caseEngine';

describe('timelineSummary helpers', () => {
	it('maps key events to timeline entry details', () => {
		const summary: TimelineIntelligenceSummaryResult = {
			summary: 'x',
			key_events: [{ entry_id: 'e1', reason: 'Important event' }],
			gaps: []
		};
		const entries: TimelineEntry[] = [
			{
				id: 'e1',
				case_id: 'c1',
				occurred_at: '2026-03-24T10:00:00Z',
				created_at: '2026-03-24T10:05:00Z',
				created_by: 'u1',
				type: 'CALL',
				location_text: null,
				tags: [],
				text_original: 'Original text',
				text_cleaned: 'Cleaned text',
				deleted_at: null
			}
		];
		const mapped = mapTimelineSummaryKeyEvents(summary, entries);
		expect(mapped).toHaveLength(1);
		expect(mapped[0].entry_id).toBe('e1');
		expect(mapped[0].type).toBe('CALL');
		expect(mapped[0].excerpt).toContain('Cleaned text');
	});

	it('uses fallback display for missing entry IDs', () => {
		const summary: TimelineIntelligenceSummaryResult = {
			summary: 'x',
			key_events: [{ entry_id: 'missing-id', reason: 'Unknown id event' }],
			gaps: []
		};
		const mapped = mapTimelineSummaryKeyEvents(summary, []);
		expect(mapped[0].type).toBe('Unknown');
		expect(mapped[0].excerpt).toBe('Entry details unavailable.');
	});

	it('formats entry-count and filter context lines', () => {
		const summary: TimelineIntelligenceSummaryResult = {
			summary: 'x',
			key_events: [],
			gaps: [],
			meta: {
				entry_count: 42,
				date_from: '2026-03-01',
				date_to: '2026-03-24',
				types: ['CALL', 'SURVEILLANCE']
			}
		};
		const context = buildTimelineSummaryContext(summary);
		expect(context.entryCountLine).toBe('42 timeline entries');
		expect(context.filterLine).toBe('Date range: 2026-03-01 to 2026-03-24, Types: CALL, SURVEILLANCE');
	});

	it('is backward-safe when meta is missing', () => {
		const summary: TimelineIntelligenceSummaryResult = {
			summary: 'x',
			key_events: [],
			gaps: []
		};
		const context = buildTimelineSummaryContext(summary);
		expect(context.entryCountLine).toBe('unavailable');
		expect(context.entryCountLine).not.toContain('0 timeline entries');
		expect(context.filterLine).toBeNull();
	});

	it('uses fallback wording when meta exists but entry_count is missing', () => {
		const summary = {
			summary: 'x',
			key_events: [],
			gaps: [],
			meta: {
				date_from: '2026-03-01',
				date_to: null,
				types: ['NOTE']
			}
		} as unknown as TimelineIntelligenceSummaryResult;
		const context = buildTimelineSummaryContext(summary);
		expect(context.entryCountLine).toBe('unavailable');
		expect(context.entryCountLine).not.toContain('0 timeline entries');
		expect(context.filterLine).toBe('Date range: from 2026-03-01, Types: NOTE');
	});
});

