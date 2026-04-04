/**
 * Tests for Timeline "Improve text" action helpers.
 *
 * Covers:
 *   - isTimelineImproveTextNoop: noop detection from AI-rendered output
 *   - TimelineImproveState type contract
 *   - composer dirty/save-valid behavior after improvement (via timelineUnsavedDirty)
 */
import { describe, it, expect } from 'vitest';
import { isTimelineImproveTextNoop, renderTimelineParagraphText, type TimelineImproveState } from './timelineImproveText';
import { isDirtyBottomComposer, isBottomComposerSaveValid } from '../../routes/(app)/case/[id]/timeline/timelineUnsavedDirty';

// ── renderTimelineParagraphText ──────────────────────────────────────────────

describe('renderTimelineParagraphText', () => {
	it('returns empty string when blocks array is empty', () => {
		expect(renderTimelineParagraphText([])).toBe('');
	});

	it('returns empty string when no statement blocks are present', () => {
		const blocks = [
			{ blockId: 'conf-1', kind: 'conflict' as const, text: 'Statements conflict.' },
			{ blockId: 'act-1', kind: 'action' as const, text: '- Follow up tomorrow.' },
			{ blockId: 'iss-1', kind: 'issue' as const, text: '- Extraction note.' }
		];
		expect(renderTimelineParagraphText(blocks)).toBe('');
	});

	it('returns single statement text unchanged when only one statement block', () => {
		const blocks = [
			{ blockId: 'stmt-1', kind: 'statement' as const, text: 'Arrived at the scene at 09:00.' }
		];
		expect(renderTimelineParagraphText(blocks)).toBe('Arrived at the scene at 09:00.');
	});

	it('joins multiple statement blocks with a single space', () => {
		const blocks = [
			{ blockId: 'stmt-1', kind: 'statement' as const, text: 'Arrived at the scene at 09:00.' },
			{ blockId: 'stmt-2', kind: 'statement' as const, text: 'Vehicle identified as a blue Honda.' },
			{ blockId: 'stmt-3', kind: 'statement' as const, text: 'Subject fled north on foot.' }
		];
		expect(renderTimelineParagraphText(blocks)).toBe(
			'Arrived at the scene at 09:00. Vehicle identified as a blue Honda. Subject fled north on foot.'
		);
	});

	it('excludes non-statement blocks (conflict, ambiguity, action, issue)', () => {
		const blocks = [
			{ blockId: 'stmt-1', kind: 'statement' as const, text: 'Met with CI at the park.' },
			{ blockId: 'conf-1', kind: 'conflict' as const, text: 'The following statements appear to conflict: stmt-1.' },
			{ blockId: 'stmt-2', kind: 'statement' as const, text: 'A confidential source reported that the package was moved.' },
			{ blockId: 'act-1', kind: 'action' as const, text: '- Obtain search warrant.' },
			{ blockId: 'amb-1', kind: 'ambiguity' as const, text: '- Unclear timing.' },
			{ blockId: 'iss-1', kind: 'issue' as const, text: '- Extraction note.' }
		];
		expect(renderTimelineParagraphText(blocks)).toBe(
			'Met with CI at the park. A confidential source reported that the package was moved.'
		);
	});

	it('trims whitespace from individual block text before joining', () => {
		const blocks = [
			{ blockId: 'stmt-1', kind: 'statement' as const, text: '  First statement.  ' },
			{ blockId: 'stmt-2', kind: 'statement' as const, text: '  Second statement.  ' }
		];
		expect(renderTimelineParagraphText(blocks)).toBe('First statement. Second statement.');
	});

	it('produces single-paragraph output for the P39 known failing sample', () => {
		// Simulates the blocks the backend would produce from:
		// "plan is keep eyes on it through weekend, try to get plate numbers,
		//  maybe camera if good spot opens up. if cs checks out maybe do controlled buy.
		//  not enough for bigger move yet"
		// The backend renders each statement as its own block (ending with period).
		// Timeline must join them into one flowing paragraph, not leave them as separate lines.
		const blocks = [
			{
				blockId: 'stmt-s1',
				kind: 'statement' as const,
				text: 'Plan to keep eyes on the subject through the weekend, trying to obtain plate numbers and set up a camera if a good spot opens up.'
			},
			{
				blockId: 'stmt-s2',
				kind: 'statement' as const,
				text: 'If CS checks out, a controlled buy may be considered.'
			},
			{
				blockId: 'stmt-s3',
				kind: 'statement' as const,
				text: 'Not enough for a bigger move at this time.'
			}
		];
		const result = renderTimelineParagraphText(blocks);
		// Must be a single paragraph (no newlines)
		expect(result).not.toContain('\n');
		// Must contain all three statements joined by spaces
		expect(result).toBe(
			'Plan to keep eyes on the subject through the weekend, trying to obtain plate numbers and set up a camera if a good spot opens up. If CS checks out, a controlled buy may be considered. Not enough for a bigger move at this time.'
		);
	});

	it('does not include Notes annotation section headers in the output', () => {
		// renderedText would include these; renderTimelineParagraphText must not
		const blocks = [
			{ blockId: 'stmt-1', kind: 'statement' as const, text: 'Subject departed at 18:00.' },
			{ blockId: 'act-1', kind: 'action' as const, text: '- Obtain CCTV footage.' }
		];
		const result = renderTimelineParagraphText(blocks);
		expect(result).not.toContain('###');
		expect(result).not.toContain('Planned or stated next steps');
		expect(result).toBe('Subject departed at 18:00.');
	});
});

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
