/**
 * P41-44-FU3 — Server-side timeline list filter detection (aligned with loadEntries / list API).
 */
import { describe, it, expect } from 'vitest';
import { timelineListUsesServerSideFilters } from './timelineServerFiltersActive';

const base = {
	filterQueryForApi: '',
	activeFilter: 'all' as const,
	filterDateFrom: '',
	filterDateTo: ''
};

describe('timelineListUsesServerSideFilters (P41-44-FU3)', () => {
	it('returns false when no server filters (default list)', () => {
		expect(timelineListUsesServerSideFilters(base)).toBe(false);
	});

	it('returns true when debounced search query is non-empty', () => {
		expect(
			timelineListUsesServerSideFilters({ ...base, filterQueryForApi: 'witness' })
		).toBe(true);
		expect(
			timelineListUsesServerSideFilters({ ...base, filterQueryForApi: '  x  ' })
		).toBe(true);
	});

	it('returns true when type filter is not all', () => {
		expect(
			timelineListUsesServerSideFilters({ ...base, activeFilter: 'evidence' })
		).toBe(true);
	});

	it('returns true when either date bound is set', () => {
		expect(
			timelineListUsesServerSideFilters({ ...base, filterDateFrom: '2025-01-01' })
		).toBe(true);
		expect(
			timelineListUsesServerSideFilters({ ...base, filterDateTo: '2025-12-31' })
		).toBe(true);
	});

	it('treats whitespace-only query as absent', () => {
		expect(
			timelineListUsesServerSideFilters({ ...base, filterQueryForApi: '   \t' })
		).toBe(false);
	});
});
