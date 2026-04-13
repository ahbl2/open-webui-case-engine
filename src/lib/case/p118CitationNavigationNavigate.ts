/**
 * P118-04 — Navigate from Case Engine `CitationNavigationResult` only (no client route tables).
 */
import { goto } from '$app/navigation';
import { normalizeCaseIdForCompare } from '$lib/case/p102CaseQueryPresentation';
import type { CitationNavigationPayload } from '$lib/case/p103CitationNavigationTypes';
import { navigateToCitationNavigationPayload } from '$lib/case/p103CitationNavigationIntent';
import type { CitationNavigationResult } from '$lib/case/p118CitationNavigationTypes';

function trim(s: string): string {
	return typeof s === 'string' ? s.trim() : '';
}

function toP103CitationPayload(p: Extract<CitationNavigationResult, { ok: true }>['payload']): CitationNavigationPayload {
	return {
		contract_version: p.contract_version as CitationNavigationPayload['contract_version'],
		case_id: p.case_id,
		citation_kind: p.citation_kind as CitationNavigationPayload['citation_kind'],
		target_id: p.target_id,
		route_key: p.route_key as CitationNavigationPayload['route_key'],
		...(p.anchor !== undefined ? { anchor: p.anchor } : {}),
		...(p.text_span !== undefined ? { text_span: p.text_span } : {})
	};
}

export async function navigateFromCitationNavigationResult(
	result: CitationNavigationResult,
	currentCaseId: string
): Promise<{ ok: true } | { ok: false; reason: 'CASE_ID_MISMATCH' | 'UNSUPPORTED_PAYLOAD' }> {
	if (!result.ok) {
		return { ok: false, reason: 'UNSUPPORTED_PAYLOAD' };
	}
	const p = result.payload;
	const cid = trim(currentCaseId);
	if (!cid || normalizeCaseIdForCompare(p.case_id) !== normalizeCaseIdForCompare(cid)) {
		return { ok: false, reason: 'CASE_ID_MISMATCH' };
	}

	if (p.route_key === 'notes' && p.citation_kind === 'notebook_note') {
		await goto(`/case/${encodeURIComponent(cid)}/notes?note=${encodeURIComponent(p.target_id)}`);
		return { ok: true };
	}
	if (p.route_key === 'summary' && p.citation_kind === 'case_read_model') {
		const frag = trim(p.anchor?.summary_fragment_id ?? '');
		await goto(`/case/${encodeURIComponent(cid)}/summary${frag ? `#${encodeURIComponent(frag)}` : ''}`);
		return { ok: true };
	}

	return navigateToCitationNavigationPayload(toP103CitationPayload(p), cid);
}
