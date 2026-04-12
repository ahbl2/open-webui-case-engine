/**
 * P100-04 / P100-05 — Same-case navigation from trace contributors (read-only).
 *
 * Reuses Phase 97 `SynthesisSourceNavigationIntent` + history state for Timeline / Tasks / Files;
 * notebook uses the same narrow `?note=` route as P98/P99 (documented exception).
 */

import type { CaseEntitySourceKind } from '$lib/case/p100EntityExtractionContract';
import type { GotoFn } from '$lib/case/caseSynthesisSourceNavigation';
import {
	synthesisDestinationPath,
	type SynthesisSourceNavigationIntent
} from '$lib/case/caseSynthesisSourceNavigation';

function buildIntent(
	caseId: string,
	sourceKind: CaseEntitySourceKind,
	recordId: string
): SynthesisSourceNavigationIntent | 'notebook' | null {
	const cid = caseId.trim();
	const rid = recordId.trim();
	if (!cid || !rid) return null;
	switch (sourceKind) {
		case 'timeline_entry':
			return {
				v: 1,
				case_id: cid,
				authority: 'authoritative',
				source_kind: 'timeline_entry',
				source_record_id: rid,
				destination_surface: 'timeline'
			};
		case 'case_task':
			return {
				v: 1,
				case_id: cid,
				authority: 'supporting',
				source_kind: 'task',
				source_record_id: rid,
				destination_surface: 'tasks'
			};
		case 'case_file':
			return {
				v: 1,
				case_id: cid,
				authority: 'supporting',
				source_kind: 'case_file',
				source_record_id: rid,
				destination_surface: 'files'
			};
		case 'extracted_text':
			return {
				v: 1,
				case_id: cid,
				authority: 'supporting',
				source_kind: 'extracted_text',
				source_record_id: rid,
				destination_surface: 'files'
			};
		case 'notebook_note':
			return 'notebook';
		default: {
			const _x: never = sourceKind;
			return _x;
		}
	}
}

/**
 * Navigate to the Case Engine record surface for this trace row. Same-case only; no URL target ids
 * except notebook `?note=` (existing pattern).
 */
export async function navigateCaseUnderstandingTraceContributor(
	caseId: string,
	sourceKind: CaseEntitySourceKind,
	sourceRecordId: string,
	gotoFn: GotoFn
): Promise<void> {
	const intent = buildIntent(caseId, sourceKind, sourceRecordId);
	if (intent === null) return;
	const cid = caseId.trim();
	const rid = sourceRecordId.trim();
	if (intent === 'notebook') {
		await gotoFn(`/case/${encodeURIComponent(cid)}/notes?note=${encodeURIComponent(rid)}`);
		return;
	}
	await gotoFn(synthesisDestinationPath(cid, intent.destination_surface), {
		state: { synthesisSourceNavigationIntent: intent }
	});
}

export function traceContributorSurfaceLabel(kind: CaseEntitySourceKind): string {
	switch (kind) {
		case 'timeline_entry':
			return 'Timeline';
		case 'case_task':
			return 'Tasks';
		case 'case_file':
			return 'Files';
		case 'extracted_text':
			return 'Files (extracted text)';
		case 'notebook_note':
			return 'Notes';
		default: {
			const _x: never = kind;
			return _x;
		}
	}
}

/** Accessible name for “Open” — factual destination + id; no interpretive framing. */
export function openTraceContributorAriaLabel(
	kind: CaseEntitySourceKind,
	sourceRecordId: string
): string {
	const id = sourceRecordId.trim();
	return `Open ${traceContributorSurfaceLabel(kind)} record ${id}`;
}
