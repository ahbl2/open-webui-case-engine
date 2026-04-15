/**
 * P128-03 — Display helpers for proposal list (no client-side reordering).
 */

import type { ProposalRecord, ProposalStatus } from '$lib/apis/caseEngine';

const PREVIEW_MAX = 140;

function parsePayload(raw: string): Record<string, unknown> {
	try {
		return JSON.parse(raw) as Record<string, unknown>;
	} catch {
		return {};
	}
}

/** Maps stored status to neutral labels (approved → Accepted per ticket wording). */
export function p128StatusDisplayLabel(status: ProposalStatus): string {
	switch (status) {
		case 'pending':
			return 'Pending';
		case 'approved':
			return 'Accepted';
		case 'rejected':
			return 'Rejected';
		case 'committed':
			return 'Committed';
		default:
			return String(status);
	}
}

/**
 * Single-field body text for list preview (no merging with occurred_at or metadata).
 */
export function p128ProposalListPreviewBody(proposal: ProposalRecord): string {
	const pl = parsePayload(proposal.proposed_payload);
	if (proposal.proposal_type === 'note') {
		return String(pl.content ?? '').trim();
	}
	const orig = pl.text_original != null ? String(pl.text_original) : '';
	if (orig.trim() !== '') return orig;
	const cleaned = pl.text_cleaned != null ? String(pl.text_cleaned) : '';
	if (cleaned.trim() !== '') return cleaned;
	return String(pl.content ?? '').trim();
}

export function p128TruncatedPreview(text: string, maxLen = PREVIEW_MAX): string {
	const t = String(text ?? '');
	if (t.length <= maxLen) return t;
	return t.slice(0, maxLen - 1) + '…';
}
