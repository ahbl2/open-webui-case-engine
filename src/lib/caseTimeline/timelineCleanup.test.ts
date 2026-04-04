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
import { applyTimelineComposerCleanup, normalizeTimelineEntryTextForSave } from './timelineCleanup';
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
		const r = clean('Line one\r\nLine two');
		expect(r.cleanedText).toBe('Line one\nLine two');
		expect(r.changed).toBe(true);
		expect(r.changesSummary.some((s) => s.toLowerCase().includes('line ending'))).toBe(true);
	});

	it('normalizes bare CR to LF', () => {
		const r = clean('Line one\rLine two');
		expect(r.cleanedText).toBe('Line one\nLine two');
		expect(r.changed).toBe(true);
	});

	it('leaves plain LF unchanged', () => {
		const r = clean('Line one\nLine two');
		expect(r.changed).toBe(false);
	});
});

// ── Rule 2: Unicode typography ────────────────────────────────────────────────

describe('applyTimelineComposerCleanup — unicode typography', () => {
	it('converts left/right single curly quotes to straight apostrophe', () => {
		// Starts uppercase to isolate the typography rule from sentence-cap.
		const r = clean('Suspect\u2019s vehicle');
		expect(r.cleanedText).toBe("Suspect's vehicle");
		expect(r.changed).toBe(true);
	});

	it('converts left/right double curly quotes to straight quotes', () => {
		// Starts with a quote character, not a letter — sentence-cap does not fire.
		const r = clean('\u201cyes\u201d');
		expect(r.cleanedText).toBe('"yes"');
		expect(r.changed).toBe(true);
	});

	it('converts Unicode ellipsis to three dots', () => {
		// Sentence-cap also fires on the lowercase 'w'; expected output capitalizes it.
		const r = clean('waiting\u2026');
		expect(r.cleanedText).toBe('Waiting...');
		expect(r.changed).toBe(true);
	});

	it('converts en dash to hyphen', () => {
		const r = clean('Pages 1\u20133');
		expect(r.cleanedText).toBe('Pages 1-3');
		expect(r.changed).toBe(true);
	});

	it('converts em dash to hyphen', () => {
		const r = clean('Arrived\u2014late');
		expect(r.cleanedText).toBe('Arrived-late');
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
		// Starts uppercase to isolate the trailing-whitespace rule from sentence-cap.
		const r = clean('Line one   \nline two');
		expect(r.cleanedText).toBe('Line one\nline two');
		expect(r.changed).toBe(true);
	});

	it('removes trailing tabs from a line', () => {
		const r = clean('Note\t\t\nend');
		expect(r.cleanedText).toBe('Note\nend');
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
		// Sentence-cap also fires; expected output has capital 'S'.
		const r = clean('subject  arrived   at  3pm');
		expect(r.cleanedText).toBe('Subject arrived at 3pm');
		expect(r.changed).toBe(true);
	});

	it('does not collapse spaces across lines', () => {
		// Sentence-cap fires on first char; both outcomes are tested here.
		const r = clean('line one\nline  two');
		expect(r.cleanedText).toBe('Line one\nline two');
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

	it('does not alter i inside words (standalone-i rule isolation)', () => {
		// Starts uppercase to isolate the standalone-i rule from sentence-cap.
		const r = clean('Notes: information identified inside the building');
		expect(r.cleanedText).toBe('Notes: information identified inside the building');
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
	it('fixes "teh" → "the" (sentence-cap also fires on first word)', () => {
		// teh→the by typo rule, then first char capitalized: 'The suspect'
		const r = clean('teh suspect');
		expect(r.cleanedText).toBe('The suspect');
		expect(r.changed).toBe(true);
	});

	it('fixes "occured" → "occurred" (sentence-cap also fires)', () => {
		const r = clean('this occured at noon');
		expect(r.cleanedText).toBe('This occurred at noon');
	});

	it('fixes "recieve" → "receive" (sentence-cap also fires)', () => {
		const r = clean('did not recieve response');
		expect(r.cleanedText).toBe('Did not receive response');
	});

	it('fixes "seperate" → "separate" (sentence-cap also fires)', () => {
		const r = clean('seperate vehicles');
		expect(r.cleanedText).toBe('Separate vehicles');
	});

	it('preserves case for capitalised typo', () => {
		const r = clean('Teh suspect');
		expect(r.cleanedText).toBe('The suspect');
	});

	it('preserves case for all-caps typo', () => {
		const r = clean('TEH document');
		expect(r.cleanedText).toBe('THE document');
	});

	it('does not fix substring match (e.g. "together" not mangled by "teh" rule)', () => {
		// Sentence-cap capitalizes first char → 'Together'; but typo rule must NOT
		// turn 'together' into 'thether' or similar. Verifies word-boundary safety.
		const r = clean('together');
		expect(r.cleanedText).toBe('Together');
		expect(r.cleanedText).not.toContain('thether');
	});

	it('summary mentions spelling correction', () => {
		const r = clean('teh end');
		expect(r.changesSummary.some((s) => /spell/i.test(s))).toBe(true);
	});
});

// ── Rule 7: Sentence-start capitalization ────────────────────────────────────

describe('applyTimelineComposerCleanup — sentence-start capitalization', () => {
	it('capitalizes the first character of the text', () => {
		const r = clean('suspect was seen at 14:00');
		expect(r.cleanedText.startsWith('Suspect')).toBe(true);
		expect(r.changed).toBe(true);
	});

	it('capitalizes the first letter after a period-space', () => {
		const r = clean('Arrived on scene. suspect fled on foot.');
		expect(r.cleanedText).toContain('. Suspect');
		expect(r.changed).toBe(true);
	});

	it('capitalizes the first letter after an exclamation mark-space', () => {
		const r = clean('Stop! he ran north.');
		expect(r.cleanedText).toContain('! He');
		expect(r.changed).toBe(true);
	});

	it('capitalizes the first letter after a question mark-space', () => {
		const r = clean('Unknown subject? no identification found.');
		expect(r.cleanedText).toContain('? No');
		expect(r.changed).toBe(true);
	});

	it('does not change text that already has correct sentence starts', () => {
		const r = clean('Arrived at 09:00. Suspect identified. Vehicle logged.');
		expect(r.changed).toBe(false);
	});

	it('capitalizes multiple sentences in one pass', () => {
		const r = clean('arrived at noon. subject left. vehicle noted.');
		expect(r.cleanedText).toBe('Arrived at noon. Subject left. Vehicle noted.');
	});

	it('correctly transforms the P39 bug-report sample text', () => {
		const sample =
			'plan is keep eyes on it through weekend, try to get plate numbers, maybe camera if good spot opens up. if cs checks out maybe do controlled buy. not enough for bigger move yet';
		const r = clean(sample);
		expect(r.changed).toBe(true);
		expect(r.cleanedText.startsWith('Plan')).toBe(true);
		expect(r.cleanedText).toContain('. If cs');
		expect(r.cleanedText).toContain('. Not enough');
	});

	it('summary mentions sentence capitalization', () => {
		const r = clean('arrived late.');
		expect(r.changesSummary.some((s) => /capitaliz|sentence/i.test(s))).toBe(true);
	});

	it('does not double-space after punctuation', () => {
		const r = clean('one sentence.  next sentence starts here.');
		// Collapse-spaces rule runs first, so ". " is single-spaced before this rule
		expect(r.cleanedText).not.toContain('.  ');
	});
});

// ── Rule 8: Trailing newlines/whitespace at end ───────────────────────────────

describe('applyTimelineComposerCleanup — trailing newlines at end', () => {
	it('strips trailing newlines (sentence-cap also fires on first char)', () => {
		const r = clean('note\n\n\n');
		expect(r.cleanedText).toBe('Note');
		expect(r.changed).toBe(true);
	});

	it('strips trailing spaces at end (sentence-cap also fires on first char)', () => {
		const r = clean('note   ');
		expect(r.cleanedText).toBe('Note');
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
		return {
			occurred_date: '',
			occurred_time: '',
			type: 'note',
			text_original: '',
			location_text: '',
			linked_images: []
		};
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
			location_text: '',
			linked_images: []
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
			location_text: '',
			linked_images: []
		};
		expect(isBottomComposerSaveValid(draft)).toBe(false);
	});
});

// ── normalizeTimelineEntryTextForSave ────────────────────────────────────────

describe('normalizeTimelineEntryTextForSave', () => {
	it('capitalizes lowercase first character', () => {
		expect(normalizeTimelineEntryTextForSave('went to the scene.')).toBe('Went to the scene.');
	});

	it('adds trailing period when text has no sentence-ending punctuation', () => {
		expect(normalizeTimelineEntryTextForSave('Arrived at 09:00')).toBe('Arrived at 09:00.');
	});

	it('applies both rules together: lowercase start and no trailing punctuation', () => {
		expect(normalizeTimelineEntryTextForSave('subject was seen near the building'))
			.toBe('Subject was seen near the building.');
	});

	it('does not add period when text ends with period', () => {
		expect(normalizeTimelineEntryTextForSave('Arrived at 09:00.')).toBe('Arrived at 09:00.');
	});

	it('does not add period when text ends with exclamation mark', () => {
		expect(normalizeTimelineEntryTextForSave('Stop!')).toBe('Stop!');
	});

	it('does not add period when text ends with question mark', () => {
		expect(normalizeTimelineEntryTextForSave('Suspect fled?')).toBe('Suspect fled?');
	});

	it('does not modify already correct text', () => {
		const input = 'Vehicle parked outside the address.';
		expect(normalizeTimelineEntryTextForSave(input)).toBe(input);
	});

	it('preserves hedged wording — only capitalizes and adds period', () => {
		expect(normalizeTimelineEntryTextForSave('maybe the suspect left earlier'))
			.toBe('Maybe the suspect left earlier.');
	});

	it('preserves "I think" phrasing unchanged (only capitalizes first char and adds period)', () => {
		expect(normalizeTimelineEntryTextForSave('i think this might be related'))
			.toBe('I think this might be related.');
	});

	it('does not change text that starts with a digit', () => {
		expect(normalizeTimelineEntryTextForSave('3 subjects observed leaving'))
			.toBe('3 subjects observed leaving.');
	});

	it('does not change text that starts with uppercase', () => {
		expect(normalizeTimelineEntryTextForSave('Subject observed at location'))
			.toBe('Subject observed at location.');
	});

	it('returns empty string unchanged', () => {
		expect(normalizeTimelineEntryTextForSave('')).toBe('');
	});
});
