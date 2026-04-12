/**
 * P100-04 / P100-05 — Build {@link CaseEntitySourceRecordInput} rows from Case Engine read payloads (read-only).
 *
 * Used only to feed P100-01 → P100-02 aggregation on the client; no persistence.
 * **Files:** filename-only text (no extracted body) — intentional scope; not expanded by hardening.
 */

import type { CaseEntitySourceRecordInput } from '$lib/case/p100EntityExtractionContract';
import type { CaseEngineCaseTask } from '$lib/apis/caseEngine/caseTasksApi';
import type { CaseFile, NotebookNote, TimelineEntry } from '$lib/apis/caseEngine';

export interface CaseUnderstandingReadPayloads {
	readonly timeline: readonly TimelineEntry[];
	readonly tasks: readonly CaseEngineCaseTask[];
	readonly files: readonly CaseFile[];
	readonly notes: readonly NotebookNote[];
}

/**
 * Map already-fetched lists into extraction inputs. Skips soft-deleted timeline entries, tasks, notes.
 */
export function buildCaseUnderstandingSourceRecordsFromReads(
	caseId: string,
	reads: CaseUnderstandingReadPayloads
): CaseEntitySourceRecordInput[] {
	const cid = caseId.trim();
	if (!cid) return [];

	const out: CaseEntitySourceRecordInput[] = [];

	for (const e of reads.timeline) {
		if (e.deleted_at) continue;
		const body = e.text_cleaned ?? e.text_original ?? '';
		const loc = e.location_text?.trim() ?? '';
		const text = [body, loc].filter(Boolean).join('\n');
		out.push({
			case_id: cid,
			source_kind: 'timeline_entry',
			source_record_id: e.id,
			text
		});
	}

	for (const t of reads.tasks) {
		if (t.deleted_at) continue;
		const text = [t.title, t.description ?? ''].filter(Boolean).join('\n');
		out.push({
			case_id: cid,
			source_kind: 'case_task',
			source_record_id: t.id,
			text
		});
	}

	for (const f of reads.files) {
		out.push({
			case_id: cid,
			source_kind: 'case_file',
			source_record_id: String(f.id),
			text: f.original_filename ?? ''
		});
	}

	for (const n of reads.notes) {
		if (n.deleted_at) continue;
		const text = [n.title ?? '', n.current_text ?? ''].filter(Boolean).join('\n');
		out.push({
			case_id: cid,
			source_kind: 'notebook_note',
			source_record_id: String(n.id),
			text
		});
	}

	return out;
}
