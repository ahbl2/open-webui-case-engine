/**
 * Presentational view-model for `ProposalCard` (read-only; no client reorder; no cross-case data).
 */
import type { ProposalRecord, ProposalStatus } from '$lib/apis/caseEngine';
import { formatCaseDateTime } from '$lib/utils/formatDateTime';

export type ProposalCardIconKey = 'timeline' | 'note' | 'map' | 'phone' | 'generic';

export function proposalCardTitle(p: ProposalRecord): string {
	if (p.proposal_type === 'timeline') return 'Timeline Entry Proposal';
	if (p.proposal_type === 'note') return 'Note Proposal';
	return 'Proposal';
}

export function proposalCardTypeChip(p: ProposalRecord): string {
	return String(p.proposal_type ?? 'proposal')
		.trim()
		.toUpperCase();
}

export function proposalCardIconKey(
	p: ProposalRecord,
	payload: Record<string, unknown>
): ProposalCardIconKey {
	if (p.proposal_type === 'note') return 'note';
	if (p.proposal_type === 'timeline') {
		const phone = payload.phone_e164 ?? payload.phone ?? payload.phone_number;
		if (phone != null && String(phone).trim() !== '') return 'phone';
		const loc = payload.location_text;
		if (loc != null && String(loc).trim() !== '') return 'map';
		return 'timeline';
	}
	return 'generic';
}

/** Short source label for “Created by …” (workflow surfaces). */
export function proposalCardSourceLabel(
	p: ProposalRecord,
	isDocumentIngest: boolean
): string {
	if (isDocumentIngest) return 'Case file';
	if (p.source_scope === 'personal') return 'Personal thread';
	return 'Case Chat';
}

/**
 * “Created by {source} · {ts}” with operational timestamp from stored payload.
 */
export function proposalCardCreatedSubline(
	p: ProposalRecord,
	source: string
): string {
	return `Created by ${source} · ${formatCaseDateTime(p.created_at)}`;
}

/** Shown as optional muted line: reviewed / committed as “update” context. */
export function proposalCardOptionalUpdateLine(p: ProposalRecord): string | null {
	if (p.committed_at) {
		return `Recorded on case · ${formatCaseDateTime(p.committed_at)}`;
	}
	if (p.reviewed_at) {
		return `Last reviewed · ${formatCaseDateTime(p.reviewed_at)}`;
	}
	return null;
}

/** Card status chip: calm labels; not authority over Timeline. */
export function proposalCardStatusChipLabel(
	status: ProposalStatus,
	p128Presentation: boolean
): string {
	if (p128Presentation) {
		switch (status) {
			case 'pending':
				return 'Pending Review';
			case 'approved':
				return 'Accepted';
			case 'rejected':
				return 'Rejected';
			case 'committed':
				return 'On Timeline';
			default:
				return String(status);
		}
	}
	switch (status) {
		case 'pending':
			return 'Pending Review';
		case 'approved':
			return 'Approved';
		case 'rejected':
			return 'Rejected';
		case 'committed':
			return 'On record';
		default:
			return String(status);
	}
}

export const PROPOSAL_CARD_PREVIEW_CAPTION = 'Proposed content (preview)';
/** Display with `uppercase` in the card to match review-surface spec. */
