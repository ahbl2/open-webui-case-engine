/**
 * Client-side export strings for official timeline entries (read-only download).
 */
import type { TimelineEntry } from '$lib/apis/caseEngine';

export function safeTimelineExportSlug(type: string): string {
	const base = (type ?? '').trim().toLowerCase();
	const slug = base.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
	return slug || 'entry';
}

export function timelineEntryExportFilename(
	entryId: string,
	type: string,
	ext: 'txt' | 'md'
): string {
	return `case-timeline-entry-${entryId}-${safeTimelineExportSlug(type)}.${ext}`;
}

export function buildTimelineEntryExportPayload(
	entry: TimelineEntry,
	bodyText: string,
	format: 'txt' | 'md'
): { content: string; mime: string; ext: 'txt' | 'md'; filename: string } {
	const loc = entry.location_text?.trim() || '';
	const occurred = entry.occurred_at ?? '';
	const recorded = entry.created_at ?? '';
	const typeLabel = entry.type ?? '';

	let content: string;
	let mime: string;
	if (format === 'txt') {
		content =
			`Timeline entry\n` +
			`Entry ID: ${entry.id}\n` +
			`Case ID: ${entry.case_id}\n` +
			`Type: ${typeLabel}\n` +
			`Occurred at: ${occurred}\n` +
			(loc ? `Location: ${loc}\n` : '') +
			`Recorded: ${recorded}\n` +
			`Recorded by: ${entry.created_by}\n\n` +
			bodyText;
		mime = 'text/plain;charset=utf-8';
	} else {
		content =
			`# Timeline entry\n\n` +
			`- Entry ID: ${entry.id}\n` +
			`- Case ID: ${entry.case_id}\n` +
			`- Type: ${typeLabel}\n` +
			`- Occurred at: ${occurred}\n` +
			(loc ? `- Location: ${loc}\n` : '') +
			`- Recorded: ${recorded}\n` +
			`- Recorded by: ${entry.created_by}\n\n` +
			`${bodyText}\n`;
		mime = 'text/markdown;charset=utf-8';
	}

	return {
		content,
		mime,
		ext: format,
		filename: timelineEntryExportFilename(entry.id, typeLabel, format)
	};
}

/** Trigger a browser download (same pattern as Notes export). */
export function downloadTimelineEntryExport(
	entry: TimelineEntry,
	bodyText: string,
	format: 'txt' | 'md'
): void {
	const { content, mime, filename } = buildTimelineEntryExportPayload(entry, bodyText, format);
	const blob = new Blob([content], { type: mime });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}
