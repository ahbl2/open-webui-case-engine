/**
 * Client-side export strings for official timeline entries (read-only download).
 */
import type { TimelineEntry } from '$lib/apis/caseEngine';
import { downloadPlainTextAsPdf } from '$lib/caseExport/plainTextReportPdf';

export function safeTimelineExportSlug(type: string): string {
	const base = (type ?? '').trim().toLowerCase();
	const slug = base.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
	return slug || 'entry';
}

export function timelineEntryExportFilename(
	entryId: string,
	type: string,
	ext: 'txt' | 'pdf'
): string {
	return `case-timeline-entry-${entryId}-${safeTimelineExportSlug(type)}.${ext}`;
}

/** Same plain document as TXT export (metadata block + body); used for TXT download and PDF generation. */
export function buildTimelineEntryTxtDocument(entry: TimelineEntry, bodyText: string): string {
	const loc = entry.location_text?.trim() || '';
	const occurred = entry.occurred_at ?? '';
	const recorded = entry.created_at ?? '';
	const typeLabel = entry.type ?? '';

	return (
		`Timeline entry\n` +
		`Entry ID: ${entry.id}\n` +
		`Case ID: ${entry.case_id}\n` +
		`Type: ${typeLabel}\n` +
		`Occurred at: ${occurred}\n` +
		(loc ? `Location: ${loc}\n` : '') +
		`Recorded: ${recorded}\n` +
		`Recorded by: ${entry.created_by}\n\n` +
		bodyText
	);
}

export function buildTimelineEntryExportPayload(
	entry: TimelineEntry,
	bodyText: string,
	format: 'txt'
): { content: string; mime: string; ext: 'txt'; filename: string } {
	const typeLabel = entry.type ?? '';
	const content = buildTimelineEntryTxtDocument(entry, bodyText);
	return {
		content,
		mime: 'text/plain;charset=utf-8',
		ext: 'txt',
		filename: timelineEntryExportFilename(entry.id, typeLabel, 'txt')
	};
}

export function downloadTimelineEntryExport(
	entry: TimelineEntry,
	bodyText: string,
	format: 'txt' | 'pdf'
): void {
	if (format === 'txt') {
		const { content, mime, filename } = buildTimelineEntryExportPayload(entry, bodyText, 'txt');
		const blob = new Blob([content], { type: mime });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
		return;
	}

	const typeLabel = entry.type ?? '';
	const doc = buildTimelineEntryTxtDocument(entry, bodyText);
	const filename = timelineEntryExportFilename(entry.id, typeLabel, 'pdf');
	void downloadPlainTextAsPdf(doc, filename);
}
