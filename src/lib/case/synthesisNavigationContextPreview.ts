/**
 * P97-04 — Read-only orientation snippets for synthesis navigation drill-down (no AI, no persistence).
 * Uses only fields already present on the destination surface model.
 */
import type { CaseFile, TimelineEntry } from '$lib/apis/caseEngine';
import type { CaseTask } from '$lib/case/caseTaskModel';
import { formatCaseDateTime, formatOperationalCaseDateTimeWithSeconds } from '$lib/utils/formatDateTime';

export type SynthesisNavigationContextPreviewModel = {
	readonly headline: string;
	readonly lines: string[];
};

const SNIPPET_MAX = 140;

function collapseWhitespaceOneLine(s: string): string {
	return s.replace(/\s+/g, ' ').trim();
}

/** First non-empty line of entry text, truncated — no interpretation. */
export function firstLineSnippetFromEntryText(text: string | null | undefined, maxLen: number): string {
	const raw = text ?? '';
	const first = raw.split(/\r?\n/).map((l) => l.trim()).find((l) => l.length > 0) ?? '';
	const collapsed = collapseWhitespaceOneLine(first);
	if (!collapsed) return '';
	if (collapsed.length <= maxLen) return collapsed;
	return `${collapsed.slice(0, Math.max(0, maxLen - 1))}…`;
}

function taskStatusLabel(status: CaseTask['status']): string {
	switch (status) {
		case 'open':
			return 'Open';
		case 'completed':
			return 'Completed';
		case 'archived':
			return 'Archived';
		default:
			return String(status);
	}
}

/** Authoritative Timeline — minimal occurred/type/body orientation from the loaded entry only. */
export function buildAuthoritativeTimelineContextPreview(
	entry: Pick<TimelineEntry, 'occurred_at' | 'type' | 'text_original'>
): SynthesisNavigationContextPreviewModel {
	const occurred = formatOperationalCaseDateTimeWithSeconds(entry.occurred_at);
	const type = (entry.type ?? '').trim() || '—';
	const lines: string[] = [`Occurred · ${occurred}`, `Type · ${type}`];
	const snippet = firstLineSnippetFromEntryText(entry.text_original, SNIPPET_MAX);
	if (snippet) lines.push(`Text · ${snippet}`);
	return {
		headline: 'Official timeline entry',
		lines
	};
}

/** Supporting task — title/status/created from list row data only. */
export function buildSupportingTaskContextPreview(
	task: Pick<CaseTask, 'title' | 'status' | 'createdAt' | 'deletedAt'>
): SynthesisNavigationContextPreviewModel {
	const title = (task.title ?? '').trim() || '—';
	const status = task.deletedAt ? `${taskStatusLabel(task.status)} · removed from active list` : taskStatusLabel(task.status);
	const created = formatCaseDateTime(String(task.createdAt ?? ''));
	const lines = [`${title}`, `Status · ${status}`, `Created · ${created}`];
	return {
		headline: 'Operational task (supporting)',
		lines
	};
}

/** Supporting file — filename/upload time; distinguishes extracted-text reference vs file row when known. */
export function buildSupportingFileContextPreview(
	file: Pick<CaseFile, 'original_filename' | 'uploaded_at' | 'mime_type'>,
	sourceKind: 'case_file' | 'extracted_text' | null
): SynthesisNavigationContextPreviewModel {
	const name = (file.original_filename ?? '').trim() || '—';
	const uploaded = formatCaseDateTime(String(file.uploaded_at ?? ''));
	const mime = (file.mime_type ?? '').trim();
	const headline =
		sourceKind === 'extracted_text'
			? 'Case file (supporting · extracted text reference)'
			: 'Case file (supporting)';
	const lines = [`${name}`, `Uploaded · ${uploaded}`];
	if (mime) lines.push(`Type · ${mime}`);
	return {
		headline,
		lines
	};
}
