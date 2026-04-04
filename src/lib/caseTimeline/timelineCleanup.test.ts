/**
 * P39-06 — Timeline composer deterministic cleanup tests.
 *
 * Covers:
 *   1. Each individual cleanup rule (line endings, typography, whitespace, standalone i, typos)
 *   2. no-op detection (changed === false when text is already clean)
 *   3. changesSummary describes what was done
 *   4. Integration with P39-03 dirty/save-valid guards
 *   5. Edge cases: empty text, already-clean text, multiple rules firing together
 */
import { describe, expect, it } from 'vitest';
import { applyTimelineComposerCleanup } from './timelineCleanup';
import {
	isDirtyBottomComposer,
	isBottomComposerSaveValid,
	type BottomComposerDraft
} from '../../routes/(app)/case/[id]/timeline/timelineUnsavedDirty';

// ── Helpers ──────────────────────────────────────────────────────────────────

function clean(text: string) {
	return applyTimelineComposerCleanup(text);
}

// ── Empty / no-op guard ───────────────────────────────────────────────────────

describe('applyTimelineComposerCleanup — empty and no-op', () => {
	it('returns unchanged empty string without change flag', () => {
		const r = clean('');
		expect(r.cleanedText).toBe('');
		expect(r.changed).toBe(false);
		expect(r.changesSummary).toHaveLength(0);
	});

	it('returns unchanged clean text without change flag', () => {
		const r = clean('Subject arrived at 09:00.');
		expect(r.cleanedText).toBe('Subject arrived at 09:00.');
		expect(r.changed).toBe(false);
		expect(r.changesSummary).toHaveLength(0);
	});

	it('returns changed === false when no rule fires', () => {
		const r = clean('Surveillance logged at corner of Elm and Main St.');
		expect(r.changed).toBe(false);
	});
});

// ── Rule 1: Line endings ──────────────────────────────────────────────────────

describe('applyTimelineComposerCleanup — line endings', () => {
	it('normalizes CRLF to LF', () => {
		const r = clean('line one\r\nline two');
		expect(r.cleanedText).toBe('line one\nline two');
		expect(r.changed).toBe(true);
		expect(r.changesSummary.some((s) => s.toLowerCase().includes('line ending'))).toBe(true);
	});

	it('normalizes bare CR to LF', () => {
		const r = clean('line one\rline two');
		expect(r.cleanedText).toBe('line one\nline two');
		expect(r.changed).toBe(true);
	});

	it('leaves plain LF unchanged', () => {
		const r = clean('line one\nline two');
		expect(r.changed).toBe(false);
	});
});

// ── Rule 2: Unicode typography ────────────────────────────────────────────────

describe('applyTimelineComposerCleanup — unicode typography', () => {
	it('converts left/right single curly quotes to straight apostrophe', () => {
		const r = clean('suspect\u2019s vehicle');
		expect(r.cleanedText).toBe("suspect's vehicle");
		expect(r.changed).toBe(true);
	});

	it('converts left/right double curly quotes to straight quotes', () => {
		const r = clean('\u201cyes\u201d');
		expect(r.cleanedText).toBe('"yes"');
		expect(r.changed).toBe(true);
	});

	it('converts Unicode ellipsis to three dots', () => {
		const r = clean('waiting\u2026');
		expect(r.cleanedText).toBe('waiting...');
		expect(r.changed).toBe(true);
	});

	it('converts en dash to hyphen', () => {
		const r = clean('pages 1\u20133');
		expect(r.cleanedText).toBe('pages 1-3');
		expect(r.changed).toBe(true);
	});

	it('converts em dash to hyphen', () => {
		const r = clean('arrived\u2014late');
		expect(r.cleanedText).toBe('arrived-late');
		expect(r.changed).toBe(true);
	});

	it('summary mentions quote/ellipsis/dash change', () => {
		const r = clean('\u201chello\u201d');
		expect(r.changesSummary.some((s) => /quote|ellipsis|dash/i.test(s))).toBe(true);
	});
});

// ── Rule 3: Trailing whitespace per line ─────────────────────────────────────

describe('applyTimelineComposerCleanup — trailing whitespace per line', () => {
	it('removes trailing spaces from a line', () => {
		const r = clean('line one   \nline two');
		expect(r.cleanedText).toBe('line one\nline two');
		expect(r.changed).toBe(true);
	});

	it('removes trailing tabs from a line', () => {
		const r = clean('note\t\t\nend');
		expect(r.cleanedText).toBe('note\nend');
		expect(r.changed).toBe(true);
	});

	it('summary mentions trailing whitespace', () => {
		const r = clean('test   \nend');
		expect(r.changesSummary.some((s) => /trailing/i.test(s))).toBe(true);
	});
});

// ── Rule 4: Internal spaces per line ─────────────────────────────────────────

describe('applyTimelineComposerCleanup — internal spaces', () => {
	it('collapses multiple spaces to one', () => {
		const r = clean('subject  arrived   at  3pm');
		expect(r.cleanedText).toBe('subject arrived at 3pm');
		expect(r.changed).toBe(true);
	});

	it('does not collapse spaces across lines', () => {
		const r = clean('line one\nline  two');
		expect(r.cleanedText).toBe('line one\nline two');
	});

	it('summary mentions collapsed spaces', () => {
		const r = clean('a  b');
		expect(r.changesSummary.some((s) => /collapsed|spaces/i.test(s))).toBe(true);
	});
});

// ── Rule 5: Standalone i → I ─────────────────────────────────────────────────

describe('applyTimelineComposerCleanup — standalone i capitalization', () => {
	it('capitalizes standalone i', () => {
		const r = clean('i saw the vehicle');
		expect(r.cleanedText).toBe('I saw the vehicle');
		expect(r.changed).toBe(true);
	});

	it('does not alter i inside words', () => {
		const r = clean('information identified inside');
		expect(r.cleanedText).toBe('information identified inside');
		expect(r.changed).toBe(false);
	});

	it('does not alter already-uppercase I', () => {
		const r = clean('I saw the vehicle');
		expect(r.changed).toBe(false);
	});

	it('summary mentions standalone i', () => {
		const r = clean('i noted the time');
		expect(r.changesSummary.some((s) => /standalone.*i|i.*capital/i.test(s))).toBe(true);
	});
});

// ── Rule 6: Word typos ────────────────────────────────────────────────────────

describe('applyTimelineComposerCleanup — word typos', () => {
	it('fixes "teh" → "the"', () => {
		const r = clean('teh suspect');
		expect(r.cleanedText).toBe('the suspect');
		expect(r.changed).toBe(true);
	});

	it('fixes "occured" → "occurred"', () => {
		const r = clean('this occured at noon');
		expect(r.cleanedText).toBe('this occurred at noon');
	});

	it('fixes "recieve" → "receive"', () => {
		const r = clean('did not recieve response');
		expect(r.cleanedText).toBe('did not receive response');
	});

	it('fixes "seperate" → "separate"', () => {
		const r = clean('seperate vehicles');
		expect(r.cleanedText).toBe('separate vehicles');
	});

	it('preserves case for capitalised typo', () => {
		const r = clean('Teh suspect');
		expect(r.cleanedText).toBe('The suspect');
	});

	it('preserves case for all-caps typo', () => {
		const r = clean('TEH document');
		expect(r.cleanedText).toBe('THE document');
	});

	it('does not fix substring match (e.g. "together" not touched by "teh")', () => {
		const r = clean('together');
		expect(r.cleanedText).toBe('together');
	});

	it('summary mentions spelling correction', () => {
		const r = clean('teh end');
		expect(r.changesSummary.some((s) => /spell/i.test(s))).toBe(true);
	});
});

// ── Rule 7: Trailing newlines/whitespace at end ───────────────────────────────

describe('applyTimelineComposerCleanup — trailing newlines at end', () => {
	it('strips trailing newlines', () => {
		const r = clean('note\n\n\n');
		expect(r.cleanedText).toBe('note');
		expect(r.changed).toBe(true);
	});

	it('strips trailing spaces at end', () => {
		const r = clean('note   ');
		expect(r.cleanedText).toBe('note');
		expect(r.changed).toBe(true);
	});
});

// ── Multiple rules in combination ─────────────────────────────────────────────

describe('applyTimelineComposerCleanup — combined rules', () => {
	it('applies multiple rules in one pass', () => {
		const r = clean('i  saw teh suspect\u2019s vehicle\r\n   ');
		expect(r.cleanedText).toBe("I saw the suspect's vehicle");
		expect(r.changed).toBe(true);
		expect(r.changesSummary.length).toBeGreaterThan(1);
	});

	it('does not mutate the input', () => {
		const input = 'teh  note   ';
		applyTimelineComposerCleanup(input);
		expect(input).toBe('teh  note   ');
	});
});

// ── Integration with P39-03 dirty/save-valid guards ──────────────────────────

describe('applyTimelineComposerCleanup — integration with P39-03 dirty/save-valid', () => {
	function emptyDraft(): BottomComposerDraft {
		return { occurred_date: '', occurred_time: '', type: 'note', text_original: '', location_text: '' };
	}

	it('cleaned text in draft makes isDirtyBottomComposer true', () => {
		const { cleanedText } = clean('i saw teh vehicle');
		const draft: BottomComposerDraft = { ...emptyDraft(), text_original: cleanedText };
		expect(isDirtyBottomComposer(draft)).toBe(true);
	});

	it('cleaned text + date + time satisfies isBottomComposerSaveValid', () => {
		const { cleanedText } = clean('i saw teh vehicle');
		const draft: BottomComposerDraft = {
			occurred_date: '2024-06-15',
			occurred_time: '09:00',
			type: 'note',
			text_original: cleanedText,
			location_text: ''
		};
		expect(isBottomComposerSaveValid(draft)).toBe(true);
	});

	it('no-op cleanup does not change draft text', () => {
		const original = 'I saw the vehicle.';
		const { cleanedText, changed } = clean(original);
		expect(changed).toBe(false);
		expect(cleanedText).toBe(original);
	});

	it('cleanup does not auto-save — save still requires date and time', () => {
		const { cleanedText } = clean('i saw teh vehicle');
		const draft: BottomComposerDraft = {
			occurred_date: '',
			occurred_time: '',
			type: 'note',
			text_original: cleanedText,
			location_text: ''
		};
		expect(isBottomComposerSaveValid(draft)).toBe(false);
	});
});
