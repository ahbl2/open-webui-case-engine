import { describe, expect, it } from 'vitest';
import type { TimelineEntry } from '$lib/apis/caseEngine';
import {
	filterTimelineEntries,
	normalizeTimelineSearchNeedle,
	occurredWithinInclusiveUtcDateRange,
	timelineEntryUtcDateString
} from './timelineListFilter';

const typeLabel = (t: string) =>
	t === 'note' ? 'Note' : t.charAt(0).toUpperCase() + t.slice(1);

function entry(overrides: Partial<TimelineEntry> & { id: string }): TimelineEntry {
	return {
		id: overrides.id,
		case_id: 'c1',
		created_at: '2024-01-01T00:00:00Z',
		created_by: 'u1',
		occurred_at: '2024-06-15T12:00:00Z',
		type: 'note',
		location_text: null,
		tags: [],
		text_original: '',
		text_cleaned: null,
		deleted_at: null,
		...overrides
	};
}

describe('normalizeTimelineSearchNeedle', () => {
	it('trims and lowercases', () => {
		expect(normalizeTimelineSearchNeedle('  Foo  ')).toBe('foo');
	});
	it('empty when whitespace only', () => {
		expect(normalizeTimelineSearchNeedle('   ')).toBe('');
	});
});

describe('timelineEntryUtcDateString', () => {
	it('returns UTC calendar date', () => {
		expect(timelineEntryUtcDateString('2024-06-15T12:00:00Z')).toBe('2024-06-15');
	});
});

describe('occurredWithinInclusiveUtcDateRange', () => {
	it('within range', () => {
		expect(
			occurredWithinInclusiveUtcDateRange('2024-06-10T00:00:00Z', '2024-06-01', '2024-06-30')
		).toBe(true);
	});
	it('on start boundary inclusive', () => {
		expect(
			occurredWithinInclusiveUtcDateRange('2024-06-01T08:00:00Z', '2024-06-01', '2024-06-30')
		).toBe(true);
	});
	it('on end boundary inclusive', () => {
		expect(
			occurredWithinInclusiveUtcDateRange('2024-06-30T23:00:00Z', '2024-06-01', '2024-06-30')
		).toBe(true);
	});
	it('outside before range', () => {
		expect(
			occurredWithinInclusiveUtcDateRange('2024-05-31T23:59:59Z', '2024-06-01', '2024-06-30')
		).toBe(false);
	});
	it('outside after range', () => {
		expect(
			occurredWithinInclusiveUtcDateRange('2024-07-01T00:00:00Z', '2024-06-01', '2024-06-30')
		).toBe(false);
	});
	it('no lower bound', () => {
		expect(occurredWithinInclusiveUtcDateRange('2024-01-01T00:00:00Z', '', '2024-12-31')).toBe(
			true
		);
	});
	it('no upper bound', () => {
		expect(occurredWithinInclusiveUtcDateRange('2024-12-31T00:00:00Z', '2024-01-01', '')).toBe(
			true
		);
	});
	it('invalid range from > to matches nothing', () => {
		expect(
			occurredWithinInclusiveUtcDateRange('2024-06-15T12:00:00Z', '2024-06-20', '2024-06-01')
		).toBe(false);
	});
});

describe('filterTimelineEntries — search', () => {
	it('matches text_original', () => {
		const entries = [entry({ id: '1', text_original: 'Witness saw red car' })];
		const out = filterTimelineEntries(
			entries,
			{ searchText: 'red', dateFrom: '', dateTo: '', typeFilter: 'all' },
			typeLabel
		);
		expect(out).toHaveLength(1);
	});

	it('case insensitive', () => {
		const entries = [entry({ id: '1', text_original: 'Witness saw RED car' })];
		const out = filterTimelineEntries(
			entries,
			{ searchText: 'red', dateFrom: '', dateTo: '', typeFilter: 'all' },
			typeLabel
		);
		expect(out).toHaveLength(1);
	});

	it('matches location_text', () => {
		const entries = [entry({ id: '1', text_original: 'x', location_text: '123 Main St' })];
		const out = filterTimelineEntries(
			entries,
			{ searchText: 'main', dateFrom: '', dateTo: '', typeFilter: 'all' },
			typeLabel
		);
		expect(out).toHaveLength(1);
	});

	it('matches type label', () => {
		const entries = [entry({ id: '1', type: 'interview', text_original: 'hello' })];
		const out = filterTimelineEntries(
			entries,
			{ searchText: 'interview', dateFrom: '', dateTo: '', typeFilter: 'all' },
			typeLabel
		);
		expect(out).toHaveLength(1);
	});

	it('no match', () => {
		const entries = [entry({ id: '1', text_original: 'nothing here' })];
		const out = filterTimelineEntries(
			entries,
			{ searchText: 'zzz', dateFrom: '', dateTo: '', typeFilter: 'all' },
			typeLabel
		);
		expect(out).toHaveLength(0);
	});
});

describe('filterTimelineEntries — type', () => {
	it('filters by type', () => {
		const entries = [
			entry({ id: '1', type: 'note', text_original: 'a' }),
			entry({ id: '2', type: 'evidence', text_original: 'b' })
		];
		const out = filterTimelineEntries(
			entries,
			{ searchText: '', dateFrom: '', dateTo: '', typeFilter: 'evidence' },
			typeLabel
		);
		expect(out.map((e) => e.id)).toEqual(['2']);
	});
});

describe('filterTimelineEntries — combined AND', () => {
	it('requires all criteria', () => {
		const entries = [
			entry({
				id: '1',
				type: 'note',
				text_original: 'alpha witness',
				occurred_at: '2024-06-15T12:00:00Z'
			}),
			entry({
				id: '2',
				type: 'note',
				text_original: 'beta witness',
				occurred_at: '2024-07-15T12:00:00Z'
			})
		];
		const out = filterTimelineEntries(
			entries,
			{
				searchText: 'witness',
				dateFrom: '2024-06-01',
				dateTo: '2024-06-30',
				typeFilter: 'note'
			},
			typeLabel
		);
		expect(out.map((e) => e.id)).toEqual(['1']);
	});
});

describe('filterTimelineEntries — reset / no filters', () => {
	it('returns full list when criteria are empty', () => {
		const entries = [entry({ id: '1' }), entry({ id: '2' })];
		const out = filterTimelineEntries(
			entries,
			{ searchText: '', dateFrom: '', dateTo: '', typeFilter: 'all' },
			typeLabel
		);
		expect(out).toHaveLength(2);
	});
});

describe('filterTimelineEntries — order preserved', () => {
	it('keeps chronological order of input array', () => {
		const entries = [
			entry({ id: 'early', occurred_at: '2024-01-01T00:00:00Z', text_original: 'x' }),
			entry({ id: 'late', occurred_at: '2024-12-01T00:00:00Z', text_original: 'x' })
		];
		const out = filterTimelineEntries(
			entries,
			{ searchText: 'x', dateFrom: '', dateTo: '', typeFilter: 'all' },
			typeLabel
		);
		expect(out.map((e) => e.id)).toEqual(['early', 'late']);
	});
});
