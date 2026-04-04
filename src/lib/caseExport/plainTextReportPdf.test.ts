import { describe, it, expect } from 'vitest';
import {
	buildPlainTextPdfBytes,
	normalizePlainTextForPdfWinAnsi
} from './plainTextReportPdf';
import { buildTimelineEntryTxtDocument } from '$lib/caseTimeline/timelineEntryExport';
import type { TimelineEntry } from '$lib/apis/caseEngine';

describe('plainTextReportPdf', () => {
	it('buildPlainTextPdfBytes returns a PDF with expected header', async () => {
		const bytes = await buildPlainTextPdfBytes('Timeline entry\nLine two');
		expect(bytes.length).toBeGreaterThan(100);
		const head = new TextDecoder('latin1').decode(bytes.slice(0, 5));
		expect(head).toBe('%PDF-');
	});

	it('handles multiple paragraphs', async () => {
		const bytes = await buildPlainTextPdfBytes('A\n\nB');
		const head = new TextDecoder('latin1').decode(bytes.slice(0, 5));
		expect(head).toBe('%PDF-');
	});

	it('does not throw for zero-width space and line separator in Timeline-like export text', async () => {
		const entry: TimelineEntry = {
			id: 'e1',
			case_id: 'c1',
			occurred_at: '2026-01-01T12:00:00Z',
			created_at: '2026-01-02T08:00:00Z',
			created_by: 'u1',
			type: 'note',
			location_text: null,
			tags: [],
			text_original: '',
			text_cleaned: null,
			deleted_at: null
		};
		const body =
			'Witness\u200bstatement\u2028Next line\u200bhere → done \uD83D\uDE00';
		const doc = buildTimelineEntryTxtDocument(entry, body);
		const bytes = await buildPlainTextPdfBytes(doc);
		expect(new TextDecoder('latin1').decode(bytes.slice(0, 5))).toBe('%PDF-');
	});

	it('normalizePlainTextForPdfWinAnsi maps typography and strips invisible characters deterministically', () => {
		const raw =
			'Price\u00a0\u200b10\u201320\u2026\u201Cquote\u201D\u2028line2\u2192end';
		expect(normalizePlainTextForPdfWinAnsi(raw)).toBe('Price 10-20..."quote"\nline2->end');
	});

	it('normalizePlainTextForPdfWinAnsi replaces unencodable code points with placeholder', () => {
		expect(normalizePlainTextForPdfWinAnsi('ok \u4E2D end')).toBe('ok ? end');
	});
});
