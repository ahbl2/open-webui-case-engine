/**
 * P109 — eligibility for manual evidence selection checkboxes.
 * Align with existing lifecycle: only rows the UI treats as active/actionable.
 */
import type { CaseFile } from '$lib/apis/caseEngine';

export function isTimelineEntrySelectableForEvidence(entry: { deleted_at?: string | null }): boolean {
	return !entry.deleted_at;
}

export function isCaseFileSelectableForEvidence(f: CaseFile): boolean {
	const d = (f as { deleted_at?: string | null }).deleted_at;
	return !d;
}
