/**
 * P113-03 — Retrieval transparency copy and structural helpers (read-only; Case Engine authority).
 * No interpretation layer: labels describe retrieval and source-backed rows only.
 */
import type { CaseQueryCitation, CaseQueryReferentialFactRow } from '$lib/apis/caseEngine/caseQueryApi';

/** Section title — operational, not analytic. */
export const P113_CASE_QUERY_RETRIEVAL_TRANSPARENCY_TITLE = 'Retrieved source-backed facts';

/** Framing line — authority discipline; avoids analytic or derived-work wording. */
export const P113_CASE_QUERY_RETRIEVAL_TRANSPARENCY_FRAMING =
	'Values are returned as stored in Case Engine. This surface lists retrieved fields and their cited support; it does not interpret or add meaning.';

/** P113-03: Backend-aligned rows only — same length, pairwise index (no client-side matching). */
export function referentialFactsCitationsAligned(
	facts: CaseQueryReferentialFactRow[] | undefined,
	citations: CaseQueryCitation[] | undefined
): boolean {
	if (!facts || !citations) return false;
	return facts.length === citations.length && facts.length > 0;
}
