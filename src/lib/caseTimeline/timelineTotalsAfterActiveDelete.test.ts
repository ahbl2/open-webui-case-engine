import { describe, expect, it } from 'vitest';
import {
	timelineLastKnownUnfilteredAfterActiveDelete,
	timelineTotalsAfterRemoveOneFromMatchingSet
} from './timelineTotalsAfterActiveDelete';

describe('timelineTotalsAfterRemoveOneFromMatchingSet', () => {
	it('full load: 50/50 → 49/49, no more pages', () => {
		expect(timelineTotalsAfterRemoveOneFromMatchingSet(50, 49)).toEqual({
			totalEntries: 49,
			hasMore: false
		});
	});

	it('partial load: 200 total, 49 loaded → 199 total, still more', () => {
		expect(timelineTotalsAfterRemoveOneFromMatchingSet(200, 49)).toEqual({
			totalEntries: 199,
			hasMore: true
		});
	});

	it('single row: 1/1 → 0/0', () => {
		expect(timelineTotalsAfterRemoveOneFromMatchingSet(1, 0)).toEqual({
			totalEntries: 0,
			hasMore: false
		});
	});

	it('clamps total at zero', () => {
		expect(timelineTotalsAfterRemoveOneFromMatchingSet(0, 0)).toEqual({
			totalEntries: 0,
			hasMore: false
		});
	});

	it('partial: 51 total, 49 loaded after delete → still more beyond loaded', () => {
		expect(timelineTotalsAfterRemoveOneFromMatchingSet(51, 49)).toEqual({
			totalEntries: 50,
			hasMore: true
		});
	});
});

describe('timelineLastKnownUnfilteredAfterActiveDelete', () => {
	it('does not touch lastKnown when server filters apply', () => {
		expect(timelineLastKnownUnfilteredAfterActiveDelete(120, true)).toBe(120);
	});

	it('decrements when no server filters', () => {
		expect(timelineLastKnownUnfilteredAfterActiveDelete(120, false)).toBe(119);
	});

	it('clamps at zero', () => {
		expect(timelineLastKnownUnfilteredAfterActiveDelete(0, false)).toBe(0);
	});
});
