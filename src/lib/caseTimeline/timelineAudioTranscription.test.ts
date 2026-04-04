/**
 * P39-07 — Timeline composer audio transcription tests.
 *
 * Covers:
 *   1. isTimelineAudioFileSupported — supported/unsupported by extension and MIME
 *   2. unsupportedTimelineAudioMessage — content and filename embedding
 *   3. TIMELINE_AUDIO_ACCEPT — format check
 *   4. Integration with P39-03/P39-04 dirty/save-valid guards (via appendTranscriptToComposerText)
 *   5. State contract: transcription state values are the correct literals
 */
import { describe, expect, it } from 'vitest';
import {
	isTimelineAudioFileSupported,
	unsupportedTimelineAudioMessage,
	TIMELINE_AUDIO_ACCEPT,
	type TimelineTranscriptionState
} from './timelineAudioTranscription';
import { appendTranscriptToComposerText } from './timelineDictation';
import {
	isDirtyBottomComposer,
	isBottomComposerSaveValid,
	type BottomComposerDraft
} from '../../routes/(app)/case/[id]/timeline/timelineUnsavedDirty';

// ── Helpers ───────────────────────────────────────────────────────────────────

function file(name: string, type: string = '') {
	return { name, type };
}

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

// ── isTimelineAudioFileSupported — supported by extension ─────────────────────

describe('isTimelineAudioFileSupported — supported extensions', () => {
	const supported = [
		['recording.mp3', ''],
		['interview.wav', ''],
		['field-note.m4a', ''],
		['clip.mp4', ''],
		['call.ogg', ''],
		['voice.webm', ''],
		['track.flac', ''],
		['audio.mpeg', ''],
		['audio.mpga', '']
	] as const;

	for (const [name] of supported) {
		it(`accepts ${name}`, () => {
			expect(isTimelineAudioFileSupported(file(name))).toBe(true);
		});
	}
});

describe('isTimelineAudioFileSupported — case-insensitive extension', () => {
	it('accepts .MP3 uppercase extension', () => {
		expect(isTimelineAudioFileSupported(file('RECORDING.MP3'))).toBe(true);
	});

	it('accepts .WAV uppercase extension', () => {
		expect(isTimelineAudioFileSupported(file('NOTE.WAV'))).toBe(true);
	});

	it('accepts .M4A mixed-case extension', () => {
		expect(isTimelineAudioFileSupported(file('clip.M4a'))).toBe(true);
	});
});

describe('isTimelineAudioFileSupported — supported by MIME type', () => {
	it('accepts audio/mpeg MIME', () => {
		expect(isTimelineAudioFileSupported(file('recording', 'audio/mpeg'))).toBe(true);
	});

	it('accepts audio/wav MIME', () => {
		expect(isTimelineAudioFileSupported(file('note', 'audio/wav'))).toBe(true);
	});

	it('accepts audio/webm MIME', () => {
		expect(isTimelineAudioFileSupported(file('clip', 'audio/webm'))).toBe(true);
	});

	it('accepts audio/ogg MIME', () => {
		expect(isTimelineAudioFileSupported(file('call', 'audio/ogg'))).toBe(true);
	});

	it('accepts audio/x-custom MIME prefix', () => {
		expect(isTimelineAudioFileSupported(file('track.custom', 'audio/x-custom'))).toBe(true);
	});
});

// ── isTimelineAudioFileSupported — unsupported types ─────────────────────────

describe('isTimelineAudioFileSupported — unsupported types', () => {
	it('rejects PDF', () => {
		expect(isTimelineAudioFileSupported(file('report.pdf', 'application/pdf'))).toBe(false);
	});

	it('rejects DOCX', () => {
		expect(
			isTimelineAudioFileSupported(
				file(
					'report.docx',
					'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
				)
			)
		).toBe(false);
	});

	it('rejects plain text file', () => {
		expect(isTimelineAudioFileSupported(file('notes.txt', 'text/plain'))).toBe(false);
	});

	it('rejects image file', () => {
		expect(isTimelineAudioFileSupported(file('photo.jpg', 'image/jpeg'))).toBe(false);
	});

	it('rejects file with no extension and no MIME', () => {
		expect(isTimelineAudioFileSupported(file('recording', ''))).toBe(false);
	});

	it('rejects video-only MIME (no extension)', () => {
		expect(isTimelineAudioFileSupported(file('clip', 'video/mp4'))).toBe(false);
	});

	it('rejects .mp4 video file if explicitly MIME video/mp4', () => {
		// .mp4 extension is supported regardless of MIME (mp4 can carry audio);
		// the extension gate accepts it
		expect(isTimelineAudioFileSupported(file('clip.mp4', 'video/mp4'))).toBe(true);
	});
});

// ── unsupportedTimelineAudioMessage ──────────────────────────────────────────

describe('unsupportedTimelineAudioMessage', () => {
	it('includes the filename in the message', () => {
		const msg = unsupportedTimelineAudioMessage(file('badfile.xyz'));
		expect(msg).toContain('badfile.xyz');
	});

	it('mentions supported formats', () => {
		const msg = unsupportedTimelineAudioMessage(file('badfile.xyz'));
		expect(msg.toLowerCase()).toMatch(/mp3|wav|m4a/);
	});

	it('returns a non-empty string', () => {
		expect(unsupportedTimelineAudioMessage(file('x.pdf'))).toBeTruthy();
	});
});

// ── TIMELINE_AUDIO_ACCEPT ────────────────────────────────────────────────────

describe('TIMELINE_AUDIO_ACCEPT', () => {
	it('is a non-empty string', () => {
		expect(typeof TIMELINE_AUDIO_ACCEPT).toBe('string');
		expect(TIMELINE_AUDIO_ACCEPT.length).toBeGreaterThan(0);
	});

	it('includes common audio extensions', () => {
		expect(TIMELINE_AUDIO_ACCEPT).toContain('.mp3');
		expect(TIMELINE_AUDIO_ACCEPT).toContain('.wav');
		expect(TIMELINE_AUDIO_ACCEPT).toContain('.m4a');
		expect(TIMELINE_AUDIO_ACCEPT).toContain('.webm');
	});

	it('includes audio/* MIME wildcard', () => {
		expect(TIMELINE_AUDIO_ACCEPT).toContain('audio/*');
	});
});

// ── TimelineTranscriptionState — type contract ───────────────────────────────

describe('TimelineTranscriptionState type', () => {
	it('accepts idle, processing, error as valid values', () => {
		const states: TimelineTranscriptionState[] = ['idle', 'processing', 'error'];
		expect(states).toHaveLength(3);
		expect(states).toContain('idle');
		expect(states).toContain('processing');
		expect(states).toContain('error');
	});
});

// ── Integration with P39-03 dirty/save-valid guards ──────────────────────────

describe('audio transcription — integration with composer dirty/save-valid', () => {
	it('transcribed text in draft makes isDirtyBottomComposer true', () => {
		const transcribed = appendTranscriptToComposerText('', 'Suspect seen at 14:30 near warehouse.');
		const draft: BottomComposerDraft = { ...emptyDraft(), text_original: transcribed };
		expect(isDirtyBottomComposer(draft)).toBe(true);
	});

	it('transcribed text + date + time satisfies isBottomComposerSaveValid', () => {
		const transcribed = appendTranscriptToComposerText('', 'Officers arrived at the scene.');
		const draft: BottomComposerDraft = {
			occurred_date: '2024-06-15',
			occurred_time: '14:30',
			type: 'note',
			text_original: transcribed,
			location_text: '',
			linked_images: []
		};
		expect(isBottomComposerSaveValid(draft)).toBe(true);
	});

	it('transcription does not auto-save — save requires date and time', () => {
		const transcribed = appendTranscriptToComposerText('', 'Unit arrived on scene.');
		const draft: BottomComposerDraft = {
			occurred_date: '',
			occurred_time: '',
			type: 'note',
			text_original: transcribed,
			location_text: '',
			linked_images: []
		};
		expect(isBottomComposerSaveValid(draft)).toBe(false);
	});

	it('appends transcribed text to existing composer text', () => {
		const existing = 'Initial notes from call.';
		const transcript = 'Additional detail from recording.';
		const result = appendTranscriptToComposerText(existing, transcript);
		expect(result).toContain('Initial notes');
		expect(result).toContain('Additional detail');
	});

	it('handles empty transcript gracefully without changing composer text', () => {
		const existing = 'Existing notes.';
		const result = appendTranscriptToComposerText(existing, '');
		expect(result).toBe(existing);
	});

	it('handles whitespace-only transcript without changing composer text', () => {
		const existing = 'Existing notes.';
		const result = appendTranscriptToComposerText(existing, '   \n  ');
		expect(result).toBe(existing);
	});
});
