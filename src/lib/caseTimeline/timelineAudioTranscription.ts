/**
 * P39-07 — Timeline composer audio transcription helpers.
 *
 * Provides file-type support checking and user messaging for the Timeline
 * composer audio transcription feature. Transcription itself is delegated to
 * `transcribeAudio` from `$lib/apis/audio` (Open WebUI Python backend —
 * POST /audio/api/v1/transcriptions). This is not a Case Engine API call.
 *
 * Supported audio types mirror what the Whisper-compatible backend accepts:
 *   .flac, .m4a, .mp3, .mp4, .mpeg, .mpga, .ogg, .wav, .webm
 *
 * Transcribed text is appended to composerDraft.text_original using the same
 * appendTranscriptToComposerText helper as P39-04 dictation and P39-05 import.
 * No audio attachment record is created; no backend Case Engine contract is changed.
 *
 * Token note: transcribeAudio requires the Open WebUI session token
 * (localStorage.token), not the Case Engine JWT. Both are available in the
 * Timeline page; use `localStorage.token` when calling transcribeAudio.
 */

export type TimelineTranscriptionState = 'idle' | 'processing' | 'error';

/**
 * Accept attribute string for the hidden audio file input.
 * Limits the OS file picker to supported types (advisory; not enforced by the browser).
 */
export const TIMELINE_AUDIO_ACCEPT =
	'.flac,.m4a,.mp3,.mp4,.mpeg,.mpga,.ogg,.wav,.webm,audio/*';

const SUPPORTED_AUDIO_EXTENSIONS = new Set([
	'.flac',
	'.m4a',
	'.mp3',
	'.mp4',
	'.mpeg',
	'.mpga',
	'.ogg',
	'.wav',
	'.webm'
]);

function getFileExtension(filename: string): string {
	const dot = filename.lastIndexOf('.');
	return dot === -1 ? '' : filename.substring(dot).toLowerCase();
}

/**
 * Returns true if the file appears to be a supported audio type for transcription.
 * Accepts by extension or by `audio/*` MIME prefix. Non-audio document types (PDF,
 * DOCX, text files) that may carry audio/* MIME strings are not expected here;
 * supported extension list is the primary gate.
 */
export function isTimelineAudioFileSupported(file: { name: string; type: string }): boolean {
	const ext = getFileExtension(file.name);
	if (SUPPORTED_AUDIO_EXTENSIONS.has(ext)) return true;
	const type = file.type || '';
	if (type.startsWith('audio/')) return true;
	return false;
}

/**
 * Returns a user-facing message explaining why an audio file cannot be transcribed.
 */
export function unsupportedTimelineAudioMessage(file: { name: string }): string {
	return `"${file.name}" is not a supported audio format. Use MP3, WAV, M4A, MP4, WebM, OGG, FLAC, or MPEG audio files.`;
}
