/**
 * P39-04 — Timeline dictation helper tests.
 *
 * Covers:
 *   1. appendTranscriptToComposerText — all append-path cases
 *   2. Browser API helpers re-exported from notesDictationSpeech (availability,
 *      secure-context, error messages) — tested here as Timeline-facing contract
 *   3. Integration with isDirtyBottomComposer / isBottomComposerSaveValid to confirm
 *      that dictated text participates correctly in P39-03 save-guard rules
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	appendTranscriptToComposerText,
	getTimelineDictationSpeechRecognitionCtor,
	isSecureContextForTimelineDictation,
	timelineInsecureContextDictationMessage,
	timelineSpeechErrorToMessage
} from './timelineDictation';
import {
	isDirtyBottomComposer,
	isBottomComposerSaveValid,
	type BottomComposerDraft
} from '../../routes/(app)/case/[id]/timeline/timelineUnsavedDirty';

// ── appendTranscriptToComposerText ───────────────────────────────────────────

describe('appendTranscriptToComposerText', () => {
	it('returns transcript when current is empty', () => {
		expect(appendTranscriptToComposerText('', 'Subject arrived at 09:00.')).toBe(
			'Subject arrived at 09:00.'
		);
	});

	it('appends with double newline when current is non-empty', () => {
		expect(appendTranscriptToComposerText('First observation.', 'Second observation.')).toBe(
			'First observation.\n\nSecond observation.'
		);
	});

	it('returns current unchanged when transcript is empty string', () => {
		expect(appendTranscriptToComposerText('Existing text.', '')).toBe('Existing text.');
	});

	it('returns current unchanged when transcript is whitespace only', () => {
		expect(appendTranscriptToComposerText('Existing text.', '   \n  ')).toBe('Existing text.');
	});

	it('returns empty string when both are empty', () => {
		expect(appendTranscriptToComposerText('', '')).toBe('');
	});

	it('trims transcript before appending', () => {
		expect(appendTranscriptToComposerText('First.', '  Second.  ')).toBe('First.\n\nSecond.');
	});

	it('trims trailing whitespace from current before appending', () => {
		expect(appendTranscriptToComposerText('First.   ', 'Second.')).toBe('First.\n\nSecond.');
	});

	it('trims trailing newlines from current before appending', () => {
		expect(appendTranscriptToComposerText('First.\n\n', 'Second.')).toBe('First.\n\nSecond.');
	});

	it('returns just the transcript when current is whitespace only', () => {
		expect(appendTranscriptToComposerText('   ', 'Hello world.')).toBe('Hello world.');
	});

	it('does not mutate the input strings', () => {
		const a = 'Original.';
		const b = 'New text.';
		appendTranscriptToComposerText(a, b);
		expect(a).toBe('Original.');
		expect(b).toBe('New text.');
	});
});

// ── Browser API helpers (re-exported from notesDictationSpeech) ──────────────

describe('timelineDictation — browser API helpers', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('getTimelineDictationSpeechRecognitionCtor returns null when neither API exists on window', () => {
		vi.stubGlobal('window', {
			SpeechRecognition: undefined,
			webkitSpeechRecognition: undefined
		} as unknown as Window & typeof globalThis);
		expect(getTimelineDictationSpeechRecognitionCtor()).toBeNull();
	});

	it('getTimelineDictationSpeechRecognitionCtor returns the ctor when SpeechRecognition exists', () => {
		class FakeSR {}
		vi.stubGlobal('window', {
			SpeechRecognition: FakeSR,
			webkitSpeechRecognition: undefined
		} as unknown as Window & typeof globalThis);
		expect(getTimelineDictationSpeechRecognitionCtor()).toBe(FakeSR);
	});

	it('isSecureContextForTimelineDictation is true on localhost even when isSecureContext is false', () => {
		vi.stubGlobal('window', {
			location: { hostname: 'localhost' },
			isSecureContext: false
		} as unknown as Window & typeof globalThis);
		expect(isSecureContextForTimelineDictation()).toBe(true);
	});

	it('isSecureContextForTimelineDictation is true when isSecureContext is true', () => {
		vi.stubGlobal('window', {
			location: { hostname: 'app.example.com' },
			isSecureContext: true
		} as unknown as Window & typeof globalThis);
		expect(isSecureContextForTimelineDictation()).toBe(true);
	});

	it('isSecureContextForTimelineDictation is false for non-local HTTP hostname', () => {
		vi.stubGlobal('window', {
			location: { hostname: 'intranet.corp' },
			isSecureContext: false
		} as unknown as Window & typeof globalThis);
		expect(isSecureContextForTimelineDictation()).toBe(false);
	});

	it('timelineInsecureContextDictationMessage mentions HTTPS', () => {
		expect(timelineInsecureContextDictationMessage()).toMatch(/HTTPS/i);
	});

	it('timelineSpeechErrorToMessage surfaces not-allowed with microphone wording', () => {
		expect(timelineSpeechErrorToMessage('not-allowed')).toMatch(/Microphone access is blocked/i);
	});

	it('timelineSpeechErrorToMessage surfaces network error with connectivity wording', () => {
		expect(timelineSpeechErrorToMessage('network')).toMatch(/network|online|connectivity/i);
	});

	it('timelineSpeechErrorToMessage includes the raw code for unknown errors (not silent)', () => {
		expect(timelineSpeechErrorToMessage('some-unknown-code')).toContain('some-unknown-code');
	});

	it('timelineSpeechErrorToMessage returns fallback for undefined', () => {
		expect(timelineSpeechErrorToMessage(undefined)).toMatch(/Could not complete dictation/i);
	});
});

// ── Integration: dictated text participates in P39-03 dirty / save-valid ─────

describe('appendTranscriptToComposerText — integration with P39-03 dirty/save-valid guards', () => {
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

	it('appended transcript makes isDirtyBottomComposer return true', () => {
		const draft = emptyDraft();
		const updated: BottomComposerDraft = {
			...draft,
			text_original: appendTranscriptToComposerText(draft.text_original, 'Witness arrived.')
		};
		expect(isDirtyBottomComposer(updated)).toBe(true);
	});

	it('draft with dictated text + date + time satisfies isBottomComposerSaveValid', () => {
		const draft: BottomComposerDraft = {
			occurred_date: '2024-06-15',
			occurred_time: '09:00',
			type: 'note',
			text_original: appendTranscriptToComposerText('', 'Witness arrived at the scene.'),
			location_text: '',
			linked_images: []
		};
		expect(isBottomComposerSaveValid(draft)).toBe(true);
	});

	it('draft with dictated text but missing date fails isBottomComposerSaveValid', () => {
		const draft: BottomComposerDraft = {
			occurred_date: '',
			occurred_time: '09:00',
			type: 'note',
			text_original: appendTranscriptToComposerText('', 'Witness arrived.'),
			location_text: '',
			linked_images: []
		};
		expect(isBottomComposerSaveValid(draft)).toBe(false);
	});

	it('draft with dictated text but missing time fails isBottomComposerSaveValid', () => {
		const draft: BottomComposerDraft = {
			occurred_date: '2024-06-15',
			occurred_time: '',
			type: 'note',
			text_original: appendTranscriptToComposerText('', 'Witness arrived.'),
			location_text: '',
			linked_images: []
		};
		expect(isBottomComposerSaveValid(draft)).toBe(false);
	});

	it('appending an empty transcript does not make a previously-clean draft dirty', () => {
		const draft = emptyDraft();
		const updated: BottomComposerDraft = {
			...draft,
			text_original: appendTranscriptToComposerText(draft.text_original, '   ')
		};
		expect(isDirtyBottomComposer(updated)).toBe(false);
	});
});
