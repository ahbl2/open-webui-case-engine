/**
 * P102-05 — Shared presentation helpers for Phase 102 case query (read-only; Case Engine authority).
 * Keeps citation labels and scope copy consistent across citations, trace, and future surfaces.
 */
import type { CaseQueryCitation } from '$lib/apis/caseEngine/caseQueryApi';

/** Canonical scope line for single-case query surfaces (aligned with Phase 102 roadmap). */
export const P102_CASE_QUERY_SCOPE_COPY =
	'Read-only answers for this case only. Responses come from Case Engine; this surface does not search other cases or alter records.';

/** Operator-facing status line — does not label degraded/refused as success. */
export function caseQueryStatusHeadline(status: string): string {
	switch (status) {
		case 'ok':
			return 'Retrieved from cited case records';
		case 'degraded':
			return 'Partial support — review citations and message';
		case 'refused':
			return 'No answer — request not supported or no matching records';
		case 'error':
			return 'Query error — review message and reason code';
		default:
			return `Status: ${status}`;
	}
}

export function normalizeCaseIdForCompare(id: string): string {
	return String(id ?? '').trim();
}

/**
 * P102-05: Reject displaying an envelope when Case Engine `case_id` does not match the active route case
 * (defense-in-depth alongside request-generation guards).
 */
export function caseQueryResponseMatchesActiveCase(envelopeCaseId: string, activeCaseId: string): boolean {
	return normalizeCaseIdForCompare(envelopeCaseId) === normalizeCaseIdForCompare(activeCaseId);
}

/** Single formatter for citation rows in both Citations and Trace (stable kind + id + surface). */
export function formatCaseQueryCitationLabel(c: CaseQueryCitation): string {
	const field =
		'field_name' in c && typeof (c as { field_name?: string }).field_name === 'string'
			? (c as { field_name?: string }).field_name?.trim()
			: '';
	const fieldSuffix = field ? ` · field ${field}` : '';
	switch (c.kind) {
		case 'timeline_entry':
			return `Timeline entry ${c.id}${fieldSuffix}`;
		case 'case_task':
			return `Case task ${c.id}${fieldSuffix}`;
		case 'case_file':
			return `Case file ${c.id}${fieldSuffix}`;
		case 'notebook_note':
			return `Notebook note ${c.id}${fieldSuffix}`;
		case 'case_read_model':
			return `Read model (${c.read_surface}) ${c.id}`;
		default:
			return 'Citation';
	}
}
