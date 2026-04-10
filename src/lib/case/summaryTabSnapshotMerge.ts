/**
 * P51-08 — Merge Case Summary POST result with GET /case-summary/status for Summary tab state.
 * Case Engine remains source of truth; POST body is authoritative when status snapshot is missing.
 */
import type { CaseSummaryResult, CaseSummaryStatusResult } from '$lib/apis/caseEngine';

export function applyStatusOntoPostSnapshot(
	post: CaseSummaryResult,
	status: CaseSummaryStatusResult
): {
	summary: CaseSummaryResult;
	lastSummaryGeneratedAt: string | null;
	latestActivityAt: string;
	isStale: boolean;
} {
	return {
		summary: status.summary ?? post,
		lastSummaryGeneratedAt: status.lastSummaryGeneratedAt ?? post.generatedAt ?? null,
		latestActivityAt: status.latestActivityAt,
		isStale: status.isStale
	};
}
