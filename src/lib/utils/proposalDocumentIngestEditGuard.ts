/**
 * P43-05 — Deterministic dirty detection for document-ingest proposal field edits (`docEditById`).
 * Compares local edit blobs to the server payload shape (no persistence — UI-only).
 */
import { isoToDatetimeLocal } from '$lib/caseTimeline/timelineOccurredAtLocal';

export type DocumentIngestEditFields = {
	occurred_at: string;
	type: string;
	text_original: string;
	text_cleaned: string;
	occurred_at_confidence: string;
	operator_occurred_at_confirmed: boolean;
};

export function documentIngestEditFieldsFromPayload(
	payload: Record<string, unknown>
): DocumentIngestEditFields | null {
	if (payload._ce_document_timeline_intake !== true) return null;
	const conf = String(payload.occurred_at_confidence ?? 'medium').toLowerCase();
	const rawAt = payload.occurred_at != null ? String(payload.occurred_at).trim() : '';
	return {
		occurred_at: rawAt ? isoToDatetimeLocal(rawAt) : '',
		type: String(payload.type ?? ''),
		text_original: String(payload.text_original ?? ''),
		text_cleaned: String(payload.text_cleaned ?? ''),
		occurred_at_confidence: ['high', 'medium', 'low'].includes(conf) ? conf : 'medium',
		operator_occurred_at_confirmed: payload.operator_occurred_at_confirmed === true
	};
}

export function documentIngestEditsEqual(a: DocumentIngestEditFields, b: DocumentIngestEditFields): boolean {
	return (
		a.occurred_at === b.occurred_at &&
		a.type === b.type &&
		a.text_original === b.text_original &&
		a.text_cleaned === b.text_cleaned &&
		a.occurred_at_confidence === b.occurred_at_confidence &&
		a.operator_occurred_at_confirmed === b.operator_occurred_at_confirmed
	);
}

/** Minimal proposal shape for dirty checks (avoids importing full API type in tests). */
export type ProposalPayloadCarrier = {
	proposal_type: string;
	proposed_payload: string;
};

export function isDocumentIngestEditDirtyForProposal(
	edit: DocumentIngestEditFields,
	proposal: ProposalPayloadCarrier
): boolean {
	if (proposal.proposal_type !== 'timeline') return false;
	let pl: Record<string, unknown>;
	try {
		pl = JSON.parse(proposal.proposed_payload) as Record<string, unknown>;
	} catch {
		return true;
	}
	const snap = documentIngestEditFieldsFromPayload(pl);
	if (!snap) return false;
	return !documentIngestEditsEqual(edit, snap);
}
