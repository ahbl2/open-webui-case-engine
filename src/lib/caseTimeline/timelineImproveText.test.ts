/**
 * Tests for Timeline "Improve text" action helpers.
 *
 * Covers:
 *   - isTimelineImproveTextNoop: noop detection from AI-rendered output
 *   - TimelineImproveState type contract
 *   - composer dirty/save-valid behavior after improvement (via timelineUnsavedDirty)
 */
import { describe, it, expect } from 'vitest';
import { isTimelineImproveTextNoop, type TimelineImproveState } from './timelineImproveText';
import { isDirtyBottomComposer, isBottomComposerSaveValid } from '../../routes/(app)/case/[id]/timeline/timelineUnsavedDirty';

// ── isTimelineImproveTextNoop ────────────────────────────────────────────────

describe('isTimelineImproveTextNoop', () => {
	it('returns true when renderedText is empty', () => {
		expect(isTimelineImproveTextNoop('', 'some source text')).toBe(true);
	});

	it('returns true when renderedText is whitespace only', () => {
		expect(isTimelineImproveTextNoop('   \n  ', 'some source text')).toBe(true);
	});

	it('returns true when renderedText trims to the same string as sourceText', () => {
		expect(isTimelineImproveTextNoop('Same text.', 'Same text.')).toBe(true);
	});

	it('returns true when whitespace differs but trimmed content is identical', () => {
		expect(isTimelineImproveTextNoop('  Same text.  ', '  Same text.  ')).toBe(true);
	});

	it('returns true when only leading/trailing whitespace differs', () => {
		expect(isTimelineImproveTextNoop('Arrived at 09:00.', '  Arrived at 09:00.  ')).toBe(true);
	});

	it('returns false when renderedText differs from sourceText', () => {
		expect(isTimelineImproveTextNoop('Improved text.', 'original text')).toBe(false);
	});

	it('returns false when renderedText has added sentence capitalization', () => {
		const source = 'arrived at scene. vehicle parked nearby.';
		const rendered = 'Arrived at scene. Vehicle parked nearby.';
		expect(isTimelineImproveTextNoop(rendered, source)).toBe(false);
	});

	it('returns false for the known failing sample from P39 bug report', () => {
		const source =
			'plan is keep eyes on it through weekend, try to get plate numbers, maybe camera if good spot opens up. if cs checks out maybe do controlled buy. not enough for bigger move yet';
		// Any AI improvement that changes at least one character is not a noop.
		const improved = 'Plan is keep eyes on it through weekend, try to get plate numbers, maybe camera if good spot opens up. If CS checks out, maybe do controlled buy. Not enough for bigger move yet.';
		expect(isTimelineImproveTextNoop(improved, source)).toBe(false);
	});

	it('returns false when punctuation or grammar is corrected', () => {
		expect(isTimelineImproveTextNoop('Suspect fled north.', 'suspect fled north')).toBe(false);
	});
});

// ── TimelineImproveState type contract ──────────────────────────────────────

describe('TimelineImproveState type contract', () => {
	it('supports all expected literal states', () => {
		const states: TimelineImproveState[] = ['idle', 'processing', 'applied', 'noop', 'error'];
		expect(states).toHaveLength(5);
		expect(states).toContain('idle');
		expect(states).toContain('processing');
		expect(states).toContain('applied');
		expect(states).toContain('noop');
		expect(states).toContain('error');
	});
});

// ── Dirty / save-valid behavior after improvement ────────────────────────────

describe('composer dirty/save-valid state after Improve text', () => {
	it('isDirtyBottomComposer returns true when text_original is non-empty (improved)', () => {
		const improved = {
			occurred_date: '2026-04-04',
			occurred_time: '14:30',
			text_original: 'Arrived at scene. Suspect identified.',
			location_text: ''
		};
		expect(isDirtyBottomComposer(improved)).toBe(true);
	});

	it('isDirtyBottomComposer returns false when no fields are filled', () => {
		const blank = { occurred_date: '', occurred_time: '', text_original: '', location_text: '' };
		expect(isDirtyBottomComposer(blank)).toBe(false);
	});

	it('isBottomComposerSaveValid is true after improvement sets non-empty text', () => {
		const draft = {
			occurred_date: '2026-04-04',
			occurred_time: '14:30',
			text_original: 'Arrived at scene. Suspect identified.',
			location_text: ''
		};
		expect(isBottomComposerSaveValid(draft)).toBe(true);
	});

	it('isBottomComposerSaveValid is false if improved text is somehow empty', () => {
		const draft = { occurred_date: '2026-04-04', occurred_time: '14:30', text_original: '', location_text: '' };
		expect(isBottomComposerSaveValid(draft)).toBe(false);
	});

	it('save validity requires date and time in addition to text (no contract change)', () => {
		const draftNoDate = { occurred_date: '', occurred_time: '14:30', text_original: 'Some text.', location_text: '' };
		const draftNoTime = { occurred_date: '2026-04-04', occurred_time: '', text_original: 'Some text.', location_text: '' };
		expect(isBottomComposerSaveValid(draftNoDate)).toBe(false);
		expect(isBottomComposerSaveValid(draftNoTime)).toBe(false);
	});
});
