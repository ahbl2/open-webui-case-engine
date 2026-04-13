/**
 * P115-04 — Map Case Engine query trace to operational inclusion labels (no inference).
 */
import type { CaseQueryReferentialFactRow, CaseQueryTrace } from '$lib/apis/caseEngine/caseQueryApi';

export const P115_DIRECT_MATCH_LABEL = 'Direct match';
export const P115_INCLUDED_BY_RELATIONSHIP_LABEL = 'Included by explicit relationship';

export function referentialFactInclusionLabel(
	fact: CaseQueryReferentialFactRow,
	trace: CaseQueryTrace
): typeof P115_DIRECT_MATCH_LABEL | typeof P115_INCLUDED_BY_RELATIONSHIP_LABEL {
	const rr = trace.relationship_retrieval;
	if (!rr) return P115_DIRECT_MATCH_LABEL;
	const linked = rr.linked_included.some(
		(x) => x.kind === fact.source_type && x.id === fact.source_id
	);
	return linked ? P115_INCLUDED_BY_RELATIONSHIP_LABEL : P115_DIRECT_MATCH_LABEL;
}
