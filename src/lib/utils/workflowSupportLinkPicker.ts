import type { CaseFile, NotebookNote, TimelineEntry, WorkflowSupportTargetKind } from '$lib/apis/caseEngine';
import {
	formatCaseDateTime,
	formatOperationalCaseDateTime,
	formatOperationalCaseDateTimeWithSeconds
} from '$lib/utils/formatDateTime';

function shortPickerEntryId(id: string): string {
	if (id.length <= 12) return id;
	return `${id.slice(0, 8)}…`;
}

export type SupportLinkPickerRow = {
	id: string;
	kind: WorkflowSupportTargetKind;
	primaryLine: string;
	secondaryLine: string;
	teaser: string;
	previewTitle: string;
	previewMeta: string;
	previewBody: string;
};

const TEASER_MAX = 88;
const PREVIEW_BODY_MAX = 3500;

export function collapsePickerWhitespace(s: string): string {
	return s.replace(/\s+/g, ' ').trim();
}

export function clipPickerSnippet(text: string, max: number): string {
	const c = collapsePickerWhitespace(text);
	if (c.length <= max) return c;
	return `${c.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/** P60-09 — client-side substring filter over row fields shown in the picker (case-insensitive). */
export function filterSupportLinkPickerRows(
	rows: SupportLinkPickerRow[],
	query: string
): SupportLinkPickerRow[] {
	const q = collapsePickerWhitespace(query).toLowerCase();
	if (!q) return rows;
	return rows.filter((r) => {
		const hay = `${r.primaryLine}\n${r.secondaryLine}\n${r.teaser}`.toLowerCase();
		return hay.includes(q);
	});
}

function timelineBodyText(e: TimelineEntry): string {
	const orig = (e.text_original ?? '').trim();
	if (orig.length > 0) return orig;
	return (e.text_cleaned ?? '').trim();
}

function formatFileSizeBytes(n: number): string {
	if (!Number.isFinite(n) || n < 0) return '—';
	if (n < 1024) return `${Math.round(n)} B`;
	if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
	return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function fileExtractionLabel(f: CaseFile): string {
	const raw = f['extraction_status'];
	return typeof raw === 'string' ? raw.replace(/_/g, ' ') : 'not available';
}

export function buildTimelineSupportPickerRows(entries: TimelineEntry[]): SupportLinkPickerRow[] {
	return entries.map((e) => {
		const typeLabel = (e.type ?? '').trim() || 'entry';
		const occurredFull = e.occurred_at ? formatOperationalCaseDateTimeWithSeconds(e.occurred_at) : '—';
		const occurredRow = e.occurred_at ? formatOperationalCaseDateTime(e.occurred_at) : '—';
		const loc = (e.location_text ?? '').trim();
		const body = timelineBodyText(e);
		/** P60-10 — time-first row for chronological scan; type second. List uses minute precision; preview meta keeps seconds. */
		const primaryLine = `${occurredRow} · ${typeLabel}`;
		const tagPart = e.tags?.length ? e.tags.join(', ') : '';
		const versions = e.version_count;
		const editHint =
			typeof versions === 'number' && versions > 0
				? `${versions} prior edit${versions === 1 ? '' : 's'}`
				: '';
		const secondaryParts = [
			loc,
			tagPart,
			editHint,
			`Entry ${shortPickerEntryId(e.id)}`
		].filter(Boolean);
		const secondaryLine = secondaryParts.join(' · ');
		const teaser = clipPickerSnippet(body || typeLabel, TEASER_MAX);
		const previewMeta = [
			`Type: ${typeLabel}`,
			`Occurred: ${occurredFull}`,
			loc ? `Location: ${loc}` : '',
			tagPart ? `Tags: ${tagPart}` : '',
			`Entry ID: ${e.id}`
		]
			.filter(Boolean)
			.join('\n');
		const previewTitle = `${typeLabel} · ${occurredFull}`;
		return {
			id: e.id,
			kind: 'TIMELINE_ENTRY',
			primaryLine,
			secondaryLine,
			teaser,
			previewTitle,
			previewMeta,
			previewBody: clipPickerSnippet(body, PREVIEW_BODY_MAX)
		};
	});
}

export function buildNotebookSupportPickerRows(notes: NotebookNote[]): SupportLinkPickerRow[] {
	return notes.map((n) => {
		const title = n.title?.trim() ? n.title.trim() : `Note #${n.id}`;
		const updated = formatCaseDateTime(n.updated_at);
		const by = (n.updated_by_name ?? '').trim() || 'Unknown';
		const body = (n.current_text ?? '').trim();
		const primaryLine = title;
		const secondaryLine = `Updated ${updated} · ${by}`;
		const teaser = clipPickerSnippet(body || '(empty note)', TEASER_MAX);
		const previewMeta = [`Updated: ${updated}`, `Updated by: ${by}`, `Note ID: ${String(n.id)}`].join('\n');
		return {
			id: String(n.id),
			kind: 'NOTEBOOK_NOTE',
			primaryLine,
			secondaryLine,
			teaser,
			previewTitle: title,
			previewMeta,
			previewBody: clipPickerSnippet(body || '(No body text.)', PREVIEW_BODY_MAX)
		};
	});
}

export function buildCaseFileSupportPickerRows(files: CaseFile[]): SupportLinkPickerRow[] {
	return files.map((f) => {
		const name = String(f.original_filename ?? f.id);
		const mime = (f.mime_type ?? '').trim() || '—';
		const uploaded = f.uploaded_at ? formatCaseDateTime(f.uploaded_at) : '—';
		const size = formatFileSizeBytes(f.file_size_bytes);
		const tags = Array.isArray(f.tags) ? f.tags : [];
		const tagStr = tags.length ? tags.join(', ') : '';
		const exLabel = fileExtractionLabel(f);

		const primaryLine = name;
		const secondaryLine = [mime, size, uploaded].join(' · ');
		const teaser = clipPickerSnippet(tagStr || `${mime} · ${size}`, TEASER_MAX);
		const previewMeta = [
			`MIME: ${mime}`,
			`Size: ${size}`,
			`Uploaded: ${uploaded}`,
			tagStr ? `Tags: ${tagStr}` : '',
			`Extraction: ${exLabel}`,
			`File ID: ${f.id}`
		]
			.filter(Boolean)
			.join('\n');
		const previewBody = tagStr
			? `Tags: ${tagStr}\n\nFile list does not include extracted text. Open this file in Files to review content or run extraction.`
			: 'File list does not include extracted text. Open this file in Files to review content or run extraction.';

		return {
			id: f.id,
			kind: 'CASE_FILE',
			primaryLine,
			secondaryLine,
			teaser,
			previewTitle: name,
			previewMeta,
			previewBody
		};
	});
}
