/**
 * P103-04 — Map Phase 102 query citations to P103 navigation payloads (read-only; mirrors Case Engine mapping).
 */
import type { CaseQueryCitation } from '$lib/apis/caseEngine/caseQueryApi';
import {
	normalizeCaseIdForCompare,
} from '$lib/case/p102CaseQueryPresentation';
import type { CitationNavigationPayload } from '$lib/case/p103CitationNavigationTypes';
import { P103_CITATION_NAVIGATION_CONTRACT_VERSION } from '$lib/case/p103CitationNavigationTypes';

function isValidExplicitTextSpan(span: { start: number; end: number }): boolean {
	const { start, end } = span;
	if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
	if (start < 0 || start >= end) return false;
	return true;
}

export type QueryCitationNavigationResolution =
	| { kind: 'navigable'; payload: CitationNavigationPayload }
	| { kind: 'unsupported_notebook_or_read_model' }
	| { kind: 'invalid_case_context' }
	| { kind: 'invalid_file_span' }
	| { kind: 'invalid_citation' };

/**
 * Deterministic: same active case, envelope case, and citation → same resolution (no I/O).
 * Only timeline_entry, case_task, and case_file are navigable via delivered P103 integrations.
 */
export function resolveQueryCitationNavigation(
	activeCaseId: string,
	envelopeCaseId: string,
	c: CaseQueryCitation
): QueryCitationNavigationResolution {
	if (normalizeCaseIdForCompare(envelopeCaseId) !== normalizeCaseIdForCompare(activeCaseId)) {
		return { kind: 'invalid_case_context' };
	}
	const case_id = envelopeCaseId.trim();
	if (c.kind === 'notebook_note' || c.kind === 'case_read_model') {
		return { kind: 'unsupported_notebook_or_read_model' };
	}
	if (c.kind === 'case_file' && c.text_span !== undefined && !isValidExplicitTextSpan(c.text_span)) {
		return { kind: 'invalid_file_span' };
	}
	const target_id = c.id.trim();
	if (!target_id) {
		return { kind: 'invalid_citation' };
	}
	switch (c.kind) {
		case 'timeline_entry': {
			const payload: CitationNavigationPayload = {
				contract_version: P103_CITATION_NAVIGATION_CONTRACT_VERSION,
				case_id,
				citation_kind: 'timeline_entry',
				target_id,
				route_key: 'timeline'
			};
			return { kind: 'navigable', payload };
		}
		case 'case_task': {
			const payload: CitationNavigationPayload = {
				contract_version: P103_CITATION_NAVIGATION_CONTRACT_VERSION,
				case_id,
				citation_kind: 'case_task',
				target_id,
				route_key: 'tasks'
			};
			return { kind: 'navigable', payload };
		}
		case 'case_file': {
			const payload: CitationNavigationPayload = {
				contract_version: P103_CITATION_NAVIGATION_CONTRACT_VERSION,
				case_id,
				citation_kind: 'case_file',
				target_id,
				route_key: 'files',
				...(c.text_span !== undefined
					? { text_span: { start: c.text_span.start, end: c.text_span.end } }
					: {})
			};
			return { kind: 'navigable', payload };
		}
	}
}
