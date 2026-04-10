/**
 * P60-05 — Support link labels + navigation targets (presentation only).
 * Deep-link behavior:
 * - Timeline: fragment `#ce-timeline-entry-{id}` on entry cards (see TimelineEntryCard).
 * - Notes: `?note={id}` consumed by notes +page after load (integer id).
 * - Files: `?file={id}` + optional scroll on first loaded page (see CaseFilesTab).
 *
 * Limitation: files not in the first loaded page are not scrolled into view until
 * the operator loads more or clears filters.
 */
import {
	listCaseFiles,
	listCaseNotebookNotes,
	listCaseTimelineEntries,
	type WorkflowSupportLink,
	type WorkflowSupportTargetKind
} from '$lib/apis/caseEngine';
import {
	buildCaseFileSupportPickerRows,
	buildNotebookSupportPickerRows,
	buildTimelineSupportPickerRows
} from '$lib/utils/workflowSupportLinkPicker';

/** P60-11 — compact saved-reference lines (aligned with picker row builders). */
export type SupportLinkSavedDisplay = {
	primaryLine: string;
	secondaryLine: string;
	teaser: string;
	/** P60-13 — read-only expanded preview (picker-aligned; populated by loadSupportLinkTargetIndex). */
	previewTitle: string;
	previewMeta: string;
	previewBody: string;
};

export type SupportLinkTargetIndex = {
	timeline: Map<string, string>;
	notes: Map<string, string>;
	files: Map<string, string>;
	/** Richer lines for Workflow support-link panel; optional for tests/hand-built indexes. */
	savedDisplay?: {
		timeline: Map<string, SupportLinkSavedDisplay>;
		notes: Map<string, SupportLinkSavedDisplay>;
		files: Map<string, SupportLinkSavedDisplay>;
	};
};

export const supportLinkKindShortLabel: Record<WorkflowSupportTargetKind, string> = {
	TIMELINE_ENTRY: 'Timeline',
	NOTEBOOK_NOTE: 'Note',
	CASE_FILE: 'File'
};

/** Shared chip/badge tones for table + panel. */
export const supportLinkKindBadgeClass: Record<WorkflowSupportTargetKind, string> = {
	TIMELINE_ENTRY:
		'bg-sky-50 text-sky-900 dark:bg-sky-950/50 dark:text-sky-100 border-sky-200 dark:border-sky-800/60',
	NOTEBOOK_NOTE:
		'bg-violet-50 text-violet-900 dark:bg-violet-950/45 dark:text-violet-100 border-violet-200 dark:border-violet-800/60',
	CASE_FILE:
		'bg-amber-50 text-amber-950 dark:bg-amber-950/35 dark:text-amber-100 border-amber-200 dark:border-amber-800/55'
};

/** Loads label maps for active (non-deleted) targets — same surfaces as the add-link pickers. */
export async function loadSupportLinkTargetIndex(
	caseId: string,
	token: string
): Promise<SupportLinkTargetIndex> {
	const [entries, notes, files] = await Promise.all([
		listCaseTimelineEntries(caseId, token),
		listCaseNotebookNotes(caseId, token),
		listCaseFiles(caseId, token)
	]);

	const activeEntries = entries.filter((e) => !e.deleted_at);
	const timelineRows = buildTimelineSupportPickerRows(activeEntries);
	const timeline = new Map<string, string>();
	const timelineSaved = new Map<string, SupportLinkSavedDisplay>();
	for (const row of timelineRows) {
		timelineSaved.set(row.id, {
			primaryLine: row.primaryLine,
			secondaryLine: row.secondaryLine,
			teaser: row.teaser,
			previewTitle: row.previewTitle,
			previewMeta: row.previewMeta,
			previewBody: row.previewBody
		});
		timeline.set(row.id, row.primaryLine);
	}

	const activeNotes = notes.filter((n) => !n.deleted_at);
	const noteRows = buildNotebookSupportPickerRows(activeNotes);
	const notebook = new Map<string, string>();
	const notesSaved = new Map<string, SupportLinkSavedDisplay>();
	for (const row of noteRows) {
		notesSaved.set(row.id, {
			primaryLine: row.primaryLine,
			secondaryLine: row.secondaryLine,
			teaser: row.teaser,
			previewTitle: row.previewTitle,
			previewMeta: row.previewMeta,
			previewBody: row.previewBody
		});
		notebook.set(row.id, row.primaryLine);
	}

	const activeFiles = files.filter((f) => !(f as { deleted_at?: string | null }).deleted_at);
	const fileRows = buildCaseFileSupportPickerRows(activeFiles);
	const filemap = new Map<string, string>();
	const filesSaved = new Map<string, SupportLinkSavedDisplay>();
	for (const row of fileRows) {
		filesSaved.set(row.id, {
			primaryLine: row.primaryLine,
			secondaryLine: row.secondaryLine,
			teaser: row.teaser,
			previewTitle: row.previewTitle,
			previewMeta: row.previewMeta,
			previewBody: row.previewBody
		});
		filemap.set(row.id, row.primaryLine);
	}

	return {
		timeline,
		notes: notebook,
		files: filemap,
		savedDisplay: {
			timeline: timelineSaved,
			notes: notesSaved,
			files: filesSaved
		}
	};
}

/**
 * P60-12 — normalize support-link target_id for Map lookup (JSON may coerce numbers; notes use integer keys).
 */
export function normalizeSupportLinkTargetIdForLookup(
	kind: WorkflowSupportTargetKind,
	raw: unknown
): string {
	const s = String(raw ?? '').trim();
	if (!s) return '';
	if (kind === 'NOTEBOOK_NOTE' && /^\d+$/.test(s)) {
		const n = parseInt(s, 10);
		if (Number.isSafeInteger(n) && n >= 0) return String(n);
	}
	return s;
}

/** Case-insensitive match so JSON/proxy variants still align with rich display + badge. */
export function isWorkflowSupportLinkStale(link: WorkflowSupportLink): boolean {
	const a = link.target_availability;
	if (a === undefined || a === null) return false;
	return String(a).toUpperCase() === 'STALE';
}

/** P60-11 — resolved display for an active, non-stale target when present in the index. */
export function savedSupportLinkDisplay(
	link: WorkflowSupportLink,
	index: SupportLinkTargetIndex
): SupportLinkSavedDisplay | null {
	if (isWorkflowSupportLinkStale(link)) return null;
	const sd = index.savedDisplay;
	if (!sd) return null;
	const id = normalizeSupportLinkTargetIdForLookup(link.target_kind, link.target_id);
	if (!id) return null;
	switch (link.target_kind) {
		case 'TIMELINE_ENTRY':
			return sd.timeline.get(id) ?? null;
		case 'NOTEBOOK_NOTE':
			return sd.notes.get(id) ?? null;
		case 'CASE_FILE':
			return sd.files.get(id) ?? null;
		default:
			return null;
	}
}

export function primaryLabelForSupportLink(link: WorkflowSupportLink, index: SupportLinkTargetIndex): string {
	const id = normalizeSupportLinkTargetIdForLookup(link.target_kind, link.target_id);
	switch (link.target_kind) {
		case 'TIMELINE_ENTRY':
			return index.timeline.get(id) ?? `Timeline entry ${id.slice(0, 8)}…`;
		case 'NOTEBOOK_NOTE':
			return index.notes.get(id) ?? `Note ${id}`;
		case 'CASE_FILE':
			return index.files.get(id) ?? `File ${id.slice(0, 8)}…`;
		default:
			return id;
	}
}

/** Secondary line: stable id when we have a richer primary label; short id otherwise. */
export function secondaryIdLineForSupportLink(
	link: WorkflowSupportLink,
	index: SupportLinkTargetIndex
): string | null {
	if (savedSupportLinkDisplay(link, index)) return null;
	const primary = primaryLabelForSupportLink(link, index);
	const id = normalizeSupportLinkTargetIdForLookup(link.target_kind, link.target_id);
	if (primary.includes(id)) return null;
	return `ID ${id}`;
}

export function hrefForSupportLinkTarget(
	caseId: string,
	kind: WorkflowSupportTargetKind,
	targetId: string
): string {
	const id = normalizeSupportLinkTargetIdForLookup(kind, targetId);
	switch (kind) {
		case 'TIMELINE_ENTRY':
			return `/case/${caseId}/timeline#ce-timeline-entry-${id}`;
		case 'NOTEBOOK_NOTE':
			return `/case/${caseId}/notes?note=${encodeURIComponent(id)}`;
		case 'CASE_FILE':
			return `/case/${caseId}/files?file=${encodeURIComponent(id)}`;
	}
}
