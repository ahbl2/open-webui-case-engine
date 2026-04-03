/**
 * P39-04 — Timeline composer dictation helpers.
 *
 * Reuses notesDictationSpeech for browser API surface, secure-context checks,
 * and error code mapping. No AI/cleanup step — raw transcript goes directly
 * into the composer text field as visible, editable text.
 *
 * The Timeline dictation lifecycle is simpler than Notes:
 *   idle → listening (recognition active) → idle (transcript appended)
 *                                         ↘ error (browser/mic failure)
 * There is no processing or review state. Dictated text is appended to
 * composerDraft.text_original and remains fully editable before save.
 */

export type TimelineDictationState = 'idle' | 'listening' | 'error';

export {
	getNotesDictationSpeechRecognitionCtor as getTimelineDictationSpeechRecognitionCtor,
	isSecureContextForNotesDictation as isSecureContextForTimelineDictation,
	insecureContextDictationMessage as timelineInsecureContextDictationMessage,
	webSpeechErrorToOperatorMessage as timelineSpeechErrorToMessage
} from '$lib/caseNotes/notesDictationSpeech';

/**
 * Appends `transcript` to existing composer text.
 *
 * - Returns current unchanged if transcript is empty/whitespace only.
 * - Separates with a double newline when current text is non-empty.
 * - Trims trailing whitespace from current before appending.
 * - Does not mutate inputs.
 */
export function appendTranscriptToComposerText(current: string, transcript: string): string {
	const trimmed = transcript.trim();
	if (!trimmed) return current;
	const trimmedCurrent = current.trimEnd();
	return trimmedCurrent.length > 0 ? `${trimmedCurrent}\n\n${trimmed}` : trimmed;
}
