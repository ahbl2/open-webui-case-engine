/**
 * Cross-surface signal when case proposals need refetching (e.g. created from Case Chat
 * while ProposalReviewPanel is open elsewhere in the case workspace).
 */
export const CASE_PROPOSALS_INVALIDATE_EVENT = 'case-engine:proposals-invalidate' as const;

export type CaseProposalsInvalidateDetail = { caseId: string };

export function dispatchCaseProposalsInvalidate(caseId: string): void {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(
		new CustomEvent<CaseProposalsInvalidateDetail>(CASE_PROPOSALS_INVALIDATE_EVENT, {
			detail: { caseId }
		})
	);
}
