/**
 * P43-10-FU2 — Stale guard for Proposals incremental `load-more` (parity with timeline P41-44-FU1).
 * Full list reload increments `activeProposalsLoadId`; case switch changes `caseId`.
 */
export function isStaleProposalsLoadMoreAppend(
	fetchGenerationAtStart: number,
	activeLoadIdNow: number,
	caseIdAtStart: string,
	caseIdNow: string
): boolean {
	return fetchGenerationAtStart !== activeLoadIdNow || caseIdAtStart !== caseIdNow;
}
