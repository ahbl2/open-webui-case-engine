/**
 * P39-05 — Timeline text import helper tests.
 *
 * Covers:
 *   1. isTimelineImportFileSupported — supported and unsupported file types
 *   2. unsupportedTimelineImportMessage — includes filename, actionable wording
 *   3. TIMELINE_IMPORT_ACCEPT — non-empty; contains core supported extensions
 *   4. Integration: imported text participates in P39-03 dirty/save-valid guards
 *      (via appendTranscriptToComposerText — same path as P39-04 dictation)
 *   5. Unsupported file type handling (images, audio, zip)
 */
import { describe, expect, it } from 'vitest';
import {
	TIMELINE_IMPORT_ACCEPT,
	isTimelineImportFileSupported,
	unsupportedTimelineImportMessage
} from './timelineTextImport';
import { appendTranscriptToComposerText } from './timelineDictation';
import {
	isDirtyBottomComposer,
	isBottomComposerSaveValid,
	type BottomComposerDraft
} from '../../routes/(app)/case/[id]/timeline/timelineUnsavedDirty';

// ── Helper: build a minimal File-like object for testing ────────────────────

function fakeFile(name: string, type: string = ''): { name: string; type: string } {
	return { name, type };
}

// ── isTimelineImportFileSupported ────────────────────────────────────────────

describe('isTimelineImportFileSupported', () => {
	// Supported by extension
	it('accepts .txt', () => expect(isTimelineImportFileSupported(fakeFile('notes.txt'))).toBe(true));
	it('accepts .md', () => expect(isTimelineImportFileSupported(fakeFile('report.md'))).toBe(true));
	it('accepts .csv', () => expect(isTimelineImportFileSupported(fakeFile('data.csv'))).toBe(true));
	it('accepts .json', () => expect(isTimelineImportFileSupported(fakeFile('log.json'))).toBe(true));
	it('accepts .xml', () => expect(isTimelineImportFileSupported(fakeFile('export.xml'))).toBe(true));
	it('accepts .yaml', () => expect(isTimelineImportFileSupported(fakeFile('config.yaml'))).toBe(true));
	it('accepts .yml', () => expect(isTimelineImportFileSupported(fakeFile('config.yml'))).toBe(true));
	it('accepts .rtf', () => expect(isTimelineImportFileSupported(fakeFile('doc.rtf'))).toBe(true));
	it('accepts .html', () => expect(isTimelineImportFileSupported(fakeFile('page.html'))).toBe(true));
	it('accepts .htm', () => expect(isTimelineImportFileSupported(fakeFile('page.htm'))).toBe(true));
	it('accepts .pdf by extension', () => expect(isTimelineImportFileSupported(fakeFile('report.pdf'))).toBe(true));
	it('accepts .docx by extension', () => expect(isTimelineImportFileSupported(fakeFile('doc.docx'))).toBe(true));

	// Supported by MIME type
	it('accepts application/pdf MIME', () =>
		expect(isTimelineImportFileSupported(fakeFile('file', 'application/pdf'))).toBe(true));
	it('accepts DOCX MIME type', () =>
		expect(
			isTimelineImportFileSupported(
				fakeFile(
					'file',
					'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
				)
			)
		).toBe(true));
	it('accepts text/plain MIME (prefix match)', () =>
		expect(isTimelineImportFileSupported(fakeFile('file', 'text/plain'))).toBe(true));
	it('accepts text/csv MIME (prefix match)', () =>
		expect(isTimelineImportFileSupported(fakeFile('file', 'text/csv'))).toBe(true));

	// Not supported: images (no client-side OCR in V1)
	it('rejects .jpg', () =>
		expect(isTimelineImportFileSupported(fakeFile('photo.jpg', 'image/jpeg'))).toBe(false));
	it('rejects .png', () =>
		expect(isTimelineImportFileSupported(fakeFile('screenshot.png', 'image/png'))).toBe(false));
	it('rejects .webp', () =>
		expect(isTimelineImportFileSupported(fakeFile('image.webp', 'image/webp'))).toBe(false));
	it('rejects .gif', () =>
		expect(isTimelineImportFileSupported(fakeFile('anim.gif', 'image/gif'))).toBe(false));

	// Not supported: other binary/archive types
	it('rejects .zip', () =>
		expect(isTimelineImportFileSupported(fakeFile('archive.zip', 'application/zip'))).toBe(false));
	it('rejects .mp3', () =>
		expect(isTimelineImportFileSupported(fakeFile('audio.mp3', 'audio/mpeg'))).toBe(false));
	it('rejects .mp4', () =>
		expect(isTimelineImportFileSupported(fakeFile('video.mp4', 'video/mp4'))).toBe(false));
	it('rejects unknown extension with no MIME', () =>
		expect(isTimelineImportFileSupported(fakeFile('file.xyz'))).toBe(false));

	// Extension is case-insensitive
	it('accepts .PDF (uppercase extension)', () =>
		expect(isTimelineImportFileSupported(fakeFile('REPORT.PDF'))).toBe(true));
	it('accepts .TXT (uppercase extension)', () =>
		expect(isTimelineImportFileSupported(fakeFile('NOTES.TXT'))).toBe(true));
});

// ── unsupportedTimelineImportMessage ─────────────────────────────────────────

describe('unsupportedTimelineImportMessage', () => {
	it('includes the filename in the message', () => {
		const msg = unsupportedTimelineImportMessage({ name: 'photo.jpg' });
		expect(msg).toContain('photo.jpg');
	});

	it('mentions supported formats (.docx, .txt, .md)', () => {
		const msg = unsupportedTimelineImportMessage({ name: 'photo.jpg' });
		expect(msg).toMatch(/\.docx|\.txt|\.md/i);
	});

	it('is a non-empty string', () => {
		expect(unsupportedTimelineImportMessage({ name: 'x.bin' }).length).toBeGreaterThan(0);
	});
});

// ── TIMELINE_IMPORT_ACCEPT ────────────────────────────────────────────────────

describe('TIMELINE_IMPORT_ACCEPT', () => {
	it('is a non-empty string', () => {
		expect(typeof TIMELINE_IMPORT_ACCEPT).toBe('string');
		expect(TIMELINE_IMPORT_ACCEPT.length).toBeGreaterThan(0);
	});

	it('includes .pdf', () => expect(TIMELINE_IMPORT_ACCEPT).toContain('.pdf'));
	it('includes .docx', () => expect(TIMELINE_IMPORT_ACCEPT).toContain('.docx'));
	it('includes .txt', () => expect(TIMELINE_IMPORT_ACCEPT).toContain('.txt'));
	it('includes .md', () => expect(TIMELINE_IMPORT_ACCEPT).toContain('.md'));
});

// ── Integration: imported text with P39-03 dirty/save-valid guards ────────────

describe('imported text — integration with P39-03 dirty/save-valid guards', () => {
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

	it('appended import text makes isDirtyBottomComposer return true', () => {
		const draft = emptyDraft();
		const updated: BottomComposerDraft = {
			...draft,
			text_original: appendTranscriptToComposerText(draft.text_original, 'Extracted file contents.')
		};
		expect(isDirtyBottomComposer(updated)).toBe(true);
	});

	it('draft with imported text + date + time satisfies isBottomComposerSaveValid', () => {
		const draft: BottomComposerDraft = {
			occurred_date: '2024-06-15',
			occurred_time: '14:30',
			type: 'note',
			text_original: appendTranscriptToComposerText('', 'Report text extracted from document.'),
			location_text: '',
			linked_images: []
		};
		expect(isBottomComposerSaveValid(draft)).toBe(true);
	});

	it('draft with imported text but missing date fails isBottomComposerSaveValid', () => {
		const draft: BottomComposerDraft = {
			occurred_date: '',
			occurred_time: '14:30',
			type: 'note',
			text_original: appendTranscriptToComposerText('', 'Extracted text.'),
			location_text: '',
			linked_images: []
		};
		expect(isBottomComposerSaveValid(draft)).toBe(false);
	});

	it('draft with imported text but missing time fails isBottomComposerSaveValid', () => {
		const draft: BottomComposerDraft = {
			occurred_date: '2024-06-15',
			occurred_time: '',
			type: 'note',
			text_original: appendTranscriptToComposerText('', 'Extracted text.'),
			location_text: '',
			linked_images: []
		};
		expect(isBottomComposerSaveValid(draft)).toBe(false);
	});

	it('imported text appends after existing composer text', () => {
		const existing = 'Initial manual note.';
		const imported = 'Text from file.';
		const result = appendTranscriptToComposerText(existing, imported);
		expect(result).toBe('Initial manual note.\n\nText from file.');
	});

	it('empty extracted text does not dirty an otherwise-clean draft', () => {
		const draft = emptyDraft();
		const updated: BottomComposerDraft = {
			...draft,
			text_original: appendTranscriptToComposerText(draft.text_original, '   ')
		};
		expect(isDirtyBottomComposer(updated)).toBe(false);
	});
});
