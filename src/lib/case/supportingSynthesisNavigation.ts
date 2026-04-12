/**
 * P97-03 — Supporting destination handling for `synthesisSourceNavigationIntent` (Tasks / Files).
 *
 * Targets are derived from `destination_surface` + `source_record_id` after validation — do not extend
 * the intent with scroll/UI metadata (Phase 97 anchor).
 */
import type { SynthesisSourceNavigationIntent } from '$lib/case/caseSynthesisSourceNavigation';

export function pickSupportingTaskTargetId(intent: unknown, currentCaseId: string): string | null {
	if (!intent || typeof intent !== 'object') return null;
	const i = intent as Partial<SynthesisSourceNavigationIntent>;
	if (i.v !== 1) return null;
	if (i.destination_surface !== 'tasks') return null;
	const cid = currentCaseId?.trim() ?? '';
	const ic = i.case_id?.trim() ?? '';
	if (!cid || !ic || ic !== cid) return null;
	if (i.authority !== 'supporting' || i.source_kind !== 'task') return null;
	const rid = i.source_record_id?.trim() ?? '';
	return rid || null;
}

export function pickSupportingFilesTargetId(intent: unknown, currentCaseId: string): string | null {
	if (!intent || typeof intent !== 'object') return null;
	const i = intent as Partial<SynthesisSourceNavigationIntent>;
	if (i.v !== 1) return null;
	if (i.destination_surface !== 'files') return null;
	const cid = currentCaseId?.trim() ?? '';
	const ic = i.case_id?.trim() ?? '';
	if (!cid || !ic || ic !== cid) return null;
	if (i.authority !== 'supporting') return null;
	if (i.source_kind !== 'case_file' && i.source_kind !== 'extracted_text') return null;
	const rid = i.source_record_id?.trim() ?? '';
	return rid || null;
}
