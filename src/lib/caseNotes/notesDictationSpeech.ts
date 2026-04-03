/**
 * Case Notes — Web Speech dictation helpers.
 *
 * Findings encoded here:
 * - Unsupported API: no `SpeechRecognition` / `webkitSpeechRecognition` (e.g. Firefox, most Safari versions).
 * - Secure context: recognition requires HTTPS or localhost; we mirror that check explicitly.
 * - Chromium behavior: with `continuous: true`, `onend` still fires when the service stops between
 *   utterances or on internal timeouts — treat as restart signal, not always user-visible failure.
 * - Network: Chrome/Edge send `network` when the vendor speech backend is unreachable (firewall, offline).
 */

export type SpeechRecognitionResultLike = { 0: { transcript: string }; isFinal: boolean };
export type SpeechRecognitionResultListLike = { length: number; [index: number]: SpeechRecognitionResultLike };

/** Minimal surface used by Notes dictation (Chromium + spec-aligned). */
export type NotesSpeechRecognition = {
	lang: string;
	continuous: boolean;
	interimResults: boolean;
	start: () => void;
	stop: () => void;
	abort?: () => void;
	onstart: ((this: NotesSpeechRecognition, ev: Event) => void) | null;
	onresult:
		| ((
				this: NotesSpeechRecognition,
				ev: { results: SpeechRecognitionResultListLike; resultIndex: number }
		  ) => void)
		| null;
	onerror: ((this: NotesSpeechRecognition, ev: { error?: string; message?: string }) => void) | null;
	onend: ((this: NotesSpeechRecognition, ev: Event) => void) | null;
};

export function getNotesDictationSpeechRecognitionCtor(): new () => NotesSpeechRecognition | null {
	if (typeof window === 'undefined') return null;
	const SpeechRecognition =
		(window as unknown as { SpeechRecognition?: new () => NotesSpeechRecognition }).SpeechRecognition ||
		(window as unknown as { webkitSpeechRecognition?: new () => NotesSpeechRecognition })
			.webkitSpeechRecognition;
	return SpeechRecognition ?? null;
}

/** True when dictation is allowed by the browser secure-context rules we enforce. */
export function isSecureContextForNotesDictation(): boolean {
	if (typeof window === 'undefined') return false;
	const hostname = window.location.hostname;
	const isLocalhost =
		hostname === 'localhost' ||
		hostname === '127.0.0.1' ||
		hostname === '::1' ||
		hostname === '[::1]';
	return window.isSecureContext === true || isLocalhost;
}

export function insecureContextDictationMessage(): string {
	return 'Dictation needs a secure connection (HTTPS) or localhost. Open the app over HTTPS and try again.';
}

/**
 * Maps Web Speech `error` codes to operator-facing text.
 * Unknown codes include the raw code so HTTPS/network issues are diagnosable without silent failure.
 */
export function webSpeechErrorToOperatorMessage(errorCode: string | undefined): string {
	switch (errorCode) {
		case 'not-allowed':
		case 'service-not-allowed':
			return 'Microphone access is blocked. Allow microphone permission and try again.';
		case 'audio-capture':
			return 'No microphone was found or it could not be opened. Check your audio input and try again.';
		case 'no-speech':
			return 'No speech was detected. Try again and speak clearly, or check that the microphone is unmuted.';
		case 'network':
			return 'Dictation could not reach the speech service (network or firewall). Chrome and Edge use an online recognizer — check connectivity and try again.';
		case 'aborted':
			return 'Dictation was stopped before completion. Please try again.';
		case 'language-not-supported':
			return 'This browser does not support speech recognition for the selected language. Try English (en-US) or use Chrome/Edge.';
		case 'bad-grammar':
		case 'not-supported-in-mimetype':
			return 'Speech recognition is not available for this setup. Use Chrome or Edge on a current version.';
		case 'interrupted':
			return 'Dictation was interrupted. Try again.';
		default:
			return errorCode
				? `Dictation failed (${errorCode}). Use Chrome or Edge on HTTPS, allow the microphone, and check your network.`
				: 'Could not complete dictation. Please try again.';
	}
}
