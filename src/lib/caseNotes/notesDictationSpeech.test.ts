/**
 * Notes dictation — Web Speech helper contract tests.
 * Documents failure modes: unsupported API, insecure context messaging, error code → operator text.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	getNotesDictationSpeechRecognitionCtor,
	insecureContextDictationMessage,
	isSecureContextForNotesDictation,
	webSpeechErrorToOperatorMessage
} from './notesDictationSpeech';

describe('notesDictationSpeech', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('webSpeechErrorToOperatorMessage surfaces network and unknown codes (not silent)', () => {
		expect(webSpeechErrorToOperatorMessage('network')).toMatch(/network|online|connectivity/i);
		expect(webSpeechErrorToOperatorMessage('not-allowed')).toMatch(/Microphone access is blocked/i);
		expect(webSpeechErrorToOperatorMessage('bogus-code')).toContain('bogus-code');
		expect(webSpeechErrorToOperatorMessage(undefined)).toMatch(/Could not complete dictation/i);
	});

	it('insecureContextDictationMessage mentions HTTPS', () => {
		expect(insecureContextDictationMessage()).toMatch(/HTTPS/i);
	});

	it('getNotesDictationSpeechRecognitionCtor returns null when neither API exists on window', () => {
		const win = {
			SpeechRecognition: undefined,
			webkitSpeechRecognition: undefined
		};
		vi.stubGlobal('window', win as unknown as Window & typeof globalThis);
		expect(getNotesDictationSpeechRecognitionCtor()).toBeNull();
	});

	it('getNotesDictationSpeechRecognitionCtor prefers SpeechRecognition over webkit when both exist', () => {
		class A {}
		class B {}
		const win = {
			SpeechRecognition: A,
			webkitSpeechRecognition: B
		};
		vi.stubGlobal('window', win as unknown as Window & typeof globalThis);
		expect(getNotesDictationSpeechRecognitionCtor()).toBe(A);
	});

	it('isSecureContextForNotesDictation is true on localhost hostname even when isSecureContext is false', () => {
		const win = {
			location: { hostname: 'localhost' },
			isSecureContext: false
		};
		vi.stubGlobal('window', win as unknown as Window & typeof globalThis);
		expect(isSecureContextForNotesDictation()).toBe(true);
	});

	it('isSecureContextForNotesDictation is true when isSecureContext is true', () => {
		const win = {
			location: { hostname: 'app.example.com' },
			isSecureContext: true
		};
		vi.stubGlobal('window', win as unknown as Window & typeof globalThis);
		expect(isSecureContextForNotesDictation()).toBe(true);
	});

	it('isSecureContextForNotesDictation is false for non-local HTTP hostname', () => {
		const win = {
			location: { hostname: 'intranet.corp' },
			isSecureContext: false
		};
		vi.stubGlobal('window', win as unknown as Window & typeof globalThis);
		expect(isSecureContextForNotesDictation()).toBe(false);
	});
});
