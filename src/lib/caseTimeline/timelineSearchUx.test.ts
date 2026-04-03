import { describe, expect, it } from 'vitest';
import {
	isTimelineFilterDateRangeInverted,
	LARGE_TIMELINE_FILTER_ENTRY_HINT_THRESHOLD,
	shouldShowLargeTimelineFilterHint,
	splitTextForSearchHighlight
} from './timelineSearchUx';

describe('isTimelineFilterDateRangeInverted', () => {
	it('true when both set and from > to', () => {
		expect(isTimelineFilterDateRangeInverted('2024-06-10', '2024-06-01')).toBe(true);
	});
	it('false when equal', () => {
		expect(isTimelineFilterDateRangeInverted('2024-06-01', '2024-06-01')).toBe(false);
	});
	it('false when from < to', () => {
		expect(isTimelineFilterDateRangeInverted('2024-06-01', '2024-06-30')).toBe(false);
	});
	it('false when from empty', () => {
		expect(isTimelineFilterDateRangeInverted('', '2024-06-30')).toBe(false);
	});
	it('false when to empty', () => {
		expect(isTimelineFilterDateRangeInverted('2024-06-01', '')).toBe(false);
	});
	it('disappears when corrected — from before to', () => {
		expect(isTimelineFilterDateRangeInverted('2024-06-20', '2024-06-01')).toBe(true);
		expect(isTimelineFilterDateRangeInverted('2024-06-01', '2024-06-20')).toBe(false);
	});
});

describe('splitTextForSearchHighlight', () => {
	it('highlights correct substring', () => {
		const segs = splitTextForSearchHighlight('foo bar baz', 'bar');
		expect(segs).toEqual([
			{ text: 'foo ', highlight: false },
			{ text: 'bar', highlight: true },
			{ text: ' baz', highlight: false }
		]);
	});
	it('case-insensitive', () => {
		const segs = splitTextForSearchHighlight('Witness saw RED car', 'red');
		expect(segs.some((s) => s.highlight && s.text === 'RED')).toBe(true);
	});
	it('empty needle — single non-highlight segment', () => {
		expect(splitTextForSearchHighlight('hello', '')).toEqual([{ text: 'hello', highlight: false }]);
	});
	it('multiple matches', () => {
		const segs = splitTextForSearchHighlight('aa aa', 'aa');
		expect(segs.filter((s) => s.highlight).length).toBe(2);
	});
	it('does not alter original string', () => {
		const s = 'abc Def ghi';
		splitTextForSearchHighlight(s, 'def');
		expect(s).toBe('abc Def ghi');
	});
});

describe('shouldShowLargeTimelineFilterHint', () => {
	it('triggers above threshold', () => {
		expect(shouldShowLargeTimelineFilterHint(LARGE_TIMELINE_FILTER_ENTRY_HINT_THRESHOLD + 1)).toBe(
			true
		);
	});
	it('not at threshold', () => {
		expect(shouldShowLargeTimelineFilterHint(LARGE_TIMELINE_FILTER_ENTRY_HINT_THRESHOLD)).toBe(
			false
		);
	});
	it('does not affect filter results — hint is orthogonal', () => {
		expect(shouldShowLargeTimelineFilterHint(10)).toBe(false);
		expect(shouldShowLargeTimelineFilterHint(600)).toBe(true);
	});
});
