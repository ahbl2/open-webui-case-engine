/**
 * P106-04 — Map entity evidence links to Phase 103 `CitationNavigationPayload` (explicit targets only).
 */
import { normalizeCaseIdForCompare } from '$lib/case/p102CaseQueryPresentation';
import type { CaseEngineEvidenceLinkReadItem } from '$lib/apis/caseEngine/caseEntitiesApi';
import type { CitationNavigationPayload } from '$lib/case/p103CitationNavigationTypes';
import { P103_CITATION_NAVIGATION_CONTRACT_VERSION } from '$lib/case/p103CitationNavigationTypes';

/**
 * Returns a P103 payload when the link can be opened on Timeline or Files; otherwise null.
 * Unavailable targets and unknown link types are non-navigable.
 */
export function citationNavigationPayloadFromEntityEvidenceLink(
	caseId: string,
	link: CaseEngineEvidenceLinkReadItem
): CitationNavigationPayload | null {
	if (link.target_status !== 'active') return null;
	const cid = caseId.trim();
	const tid = link.target_id.trim();
	if (!cid || !tid) return null;
	if (normalizeCaseIdForCompare(String(link.case_id)) !== normalizeCaseIdForCompare(cid)) {
		return null;
	}
	if (link.link_type === 'timeline_entry') {
		return {
			contract_version: P103_CITATION_NAVIGATION_CONTRACT_VERSION,
			case_id: cid,
			citation_kind: 'timeline_entry',
			target_id: tid,
			route_key: 'timeline'
		};
	}
	if (link.link_type === 'case_file') {
		return {
			contract_version: P103_CITATION_NAVIGATION_CONTRACT_VERSION,
			case_id: cid,
			citation_kind: 'case_file',
			target_id: tid,
			route_key: 'files'
		};
	}
	return null;
}
