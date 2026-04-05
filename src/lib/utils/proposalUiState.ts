/**
 * P19-10 — Proposal Review UI State Utilities
 *
 * Pure, stateless functions for proposal review UI logic.
 * No side effects. No API calls. No stores. Safe to test in isolation.
 *
 * These functions MIRROR the backend lifecycle rules exactly.
 * The UI is never the authority — backend enforces the real rules —
 * but the UI must faithfully represent what is and is not allowed
 * so that users are not confused by 400/403 errors on clearly illegal actions.
 *
 * Lifecycle mirrored here:
 *   pending  → approve → approved → commit → committed
 *   pending  → reject  → rejected
 *   approved, rejected, committed → no further lifecycle actions
 */

import type { ProposalRecord, ProposalStatus } from '$lib/apis/caseEngine';

export type AllowedAction = 'approve' | 'reject' | 'commit';

/**
 * Returns the review actions that are legal for a given proposal status.
 * Strictly mirrors backend lifecycle transitions.
 */
export function getAllowedActions(status: ProposalStatus): AllowedAction[] {
	switch (status) {
		case 'pending':
			return ['approve', 'reject'];
		case 'approved':
			return ['commit'];
		case 'rejected':
			return [];
		case 'committed':
			return [];
		default:
			return [];
	}
}

/** True if 'approve' is a legal action for this status. */
export function canApprove(status: ProposalStatus): boolean {
	return getAllowedActions(status).includes('approve');
}

/** True if 'reject' is a legal action for this status. */
export function canReject(status: ProposalStatus): boolean {
	return getAllowedActions(status).includes('reject');
}

/** True if 'commit' is a legal action for this status. */
export function canCommit(status: ProposalStatus): boolean {
	return getAllowedActions(status).includes('commit');
}

/** P40-03 — align with Case Engine `normalizeOccurredAtConfidenceInProposalPayload` for UI. */
export function normalizeProposalPayloadChronologyConfidence(
	payload: Record<string, unknown>
): 'high' | 'medium' | 'low' {
	const r = payload.occurred_at_confidence;
	const s = typeof r === 'string' ? r.trim().toLowerCase() : '';
	if (s === 'high' || s === 'medium' || s === 'low') return s;
	const o = payload.occurred_at;
	const has = o != null && String(o).trim() !== '';
	return has ? 'medium' : 'low';
}

/** Timeline commit must not proceed while low confidence lacks operator confirmation. */
export function timelineProposalCommitBlockedByLowChronology(proposal: ProposalRecord): boolean {
	if (proposal.proposal_type !== 'timeline') return false;
	let pl: Record<string, unknown>;
	try {
		pl = JSON.parse(proposal.proposed_payload) as Record<string, unknown>;
	} catch {
		return false;
	}
	if (normalizeProposalPayloadChronologyConfidence(pl) !== 'low') return false;
	return pl.operator_occurred_at_confirmed !== true;
}

/**
 * Bulk commit is enabled when:
 *   - At least one proposal is selected.
 *   - EVERY selected proposal has status = 'approved'.
 *
 * If any selected proposal is not approved, commit is disabled for the
 * whole selection (forces the user to approve all before committing).
 */
export function isBulkCommitEnabled(
	selectedIds: ReadonlySet<string>,
	proposals: readonly ProposalRecord[]
): boolean {
	if (selectedIds.size === 0) return false;
	const map = new Map(proposals.map((p) => [p.id, p]));
	for (const id of selectedIds) {
		const p = map.get(id);
		if (!p || p.status !== 'approved') return false;
		if (timelineProposalCommitBlockedByLowChronology(p)) return false;
	}
	return true;
}

/**
 * Bulk approve is enabled when:
 *   - At least one proposal is selected AND
 *   - At least one of those is 'pending'.
 *
 * Non-pending proposals in the selection are silently skipped during bulk approve.
 */
export function isBulkApproveEnabled(
	selectedIds: ReadonlySet<string>,
	proposals: readonly ProposalRecord[]
): boolean {
	if (selectedIds.size === 0) return false;
	const map = new Map(proposals.map((p) => [p.id, p]));
	for (const id of selectedIds) {
		if (map.get(id)?.status === 'pending') return true;
	}
	return false;
}

/**
 * Bulk reject uses the same rule as bulk approve.
 * Non-pending proposals in the selection are skipped.
 */
export function isBulkRejectEnabled(
	selectedIds: ReadonlySet<string>,
	proposals: readonly ProposalRecord[]
): boolean {
	return isBulkApproveEnabled(selectedIds, proposals);
}

/** Pending proposal ids in the current selection (bulk approve/reject targets). */
export function getBulkApprovePendingTargets(
	selectedIds: ReadonlySet<string>,
	proposals: readonly ProposalRecord[]
): string[] {
	const map = new Map(proposals.map((p) => [p.id, p]));
	return [...selectedIds].filter((id) => map.get(id)?.status === 'pending');
}

/** Approved proposal ids in the selection (bulk commit iterates these; UI should filter to committable). */
export function getBulkCommitApprovedTargets(
	selectedIds: ReadonlySet<string>,
	proposals: readonly ProposalRecord[]
): string[] {
	const map = new Map(proposals.map((p) => [p.id, p]));
	return [...selectedIds].filter((id) => map.get(id)?.status === 'approved');
}

/**
 * P40-05 — Mixed-queue summary for post-ingest / multi-proposal review clarity.
 * Counts rejected vs pending; splits approved into committable vs chronology-blocked (timeline only).
 */
export interface ProposalQueueMixSummary {
	pending: number;
	approvedReadyToCommit: number;
	approvedBlockedChronology: number;
	rejected: number;
	committed: number;
}

export function summarizeProposalQueueMix(
	proposals: readonly ProposalRecord[]
): ProposalQueueMixSummary {
	const g = groupByStatus(proposals);
	let approvedReadyToCommit = 0;
	let approvedBlockedChronology = 0;
	for (const p of g.approved) {
		if (p.proposal_type === 'timeline' && timelineProposalCommitBlockedByLowChronology(p)) {
			approvedBlockedChronology++;
		} else {
			approvedReadyToCommit++;
		}
	}
	return {
		pending: g.pending.length,
		approvedReadyToCommit,
		approvedBlockedChronology,
		rejected: g.rejected.length,
		committed: g.committed.length
	};
}

/** One-line operator summary; empty queue → "No proposals in this filter". */
export function formatProposalQueueMixSummary(s: ProposalQueueMixSummary): string {
	const parts: string[] = [];
	if (s.pending > 0) {
		parts.push(s.pending === 1 ? '1 pending review' : `${s.pending} pending review`);
	}
	const approvedTotal = s.approvedReadyToCommit + s.approvedBlockedChronology;
	if (approvedTotal > 0) {
		if (s.approvedBlockedChronology === 0) {
			parts.push(
				approvedTotal === 1
					? '1 approved (ready to commit)'
					: `${approvedTotal} approved (ready to commit)`
			);
		} else if (s.approvedReadyToCommit === 0) {
			parts.push(
				approvedTotal === 1
					? '1 approved — confirm chronology before commit'
					: `${approvedTotal} approved — confirm chronology before commit`
			);
		} else {
			parts.push(
				`${approvedTotal} approved (${s.approvedReadyToCommit} ready, ${s.approvedBlockedChronology} need chronology)`
			);
		}
	}
	if (s.rejected > 0) {
		parts.push(s.rejected === 1 ? '1 rejected (excluded from review queue)' : `${s.rejected} rejected (excluded from review queue)`);
	}
	if (s.committed > 0) {
		parts.push(s.committed === 1 ? '1 on official record' : `${s.committed} on official record`);
	}
	return parts.length > 0 ? parts.join(' · ') : 'No proposals in this filter';
}

/** Accessible title for bulk commit button when disabled (explains chronology / status mismatch). */
export function bulkCommitSelectionBlockedReason(
	selectedIds: ReadonlySet<string>,
	proposals: readonly ProposalRecord[]
): string | null {
	if (selectedIds.size === 0) return null;
	if (isBulkCommitEnabled(selectedIds, proposals)) return null;
	const map = new Map(proposals.map((p) => [p.id, p]));
	let blockedChrono = 0;
	let notApproved = 0;
	for (const id of selectedIds) {
		const p = map.get(id);
		if (!p) return 'Some selected proposals are unknown — refresh the list.';
		if (p.status !== 'approved') notApproved++;
		else if (timelineProposalCommitBlockedByLowChronology(p)) blockedChrono++;
	}
	if (blockedChrono > 0 && notApproved > 0) {
		return `${blockedChrono} need chronology confirmation; ${notApproved} not approved — adjust selection or complete review.`;
	}
	if (blockedChrono > 0) {
		return blockedChrono === 1
			? 'One selected proposal needs chronology confirmation before commit.'
			: `${blockedChrono} selected proposals need chronology confirmation before commit.`;
	}
	if (notApproved > 0) {
		return 'Every selected item must be approved before commit — pending items are not on the official record yet.';
	}
	return 'Cannot commit this selection.';
}

/** Groups proposals by status. All four groups are always present, possibly empty. */
export function groupByStatus(
	proposals: readonly ProposalRecord[]
): Record<ProposalStatus, ProposalRecord[]> {
	return {
		pending: proposals.filter((p) => p.status === 'pending'),
		approved: proposals.filter((p) => p.status === 'approved'),
		rejected: proposals.filter((p) => p.status === 'rejected'),
		committed: proposals.filter((p) => p.status === 'committed')
	};
}

/**
 * Maps a backend API error to a user-facing string.
 *
 * Classification:
 *   TypeError (network)                          → 'Unable to reach Case Engine'
 *   403 / access denied / self-review            → 'You are not authorized to review this proposal'
 *   400 / illegal transition / invalid state     → 'This proposal can no longer be modified'
 *   network keywords (fetch/econnrefused/etc.)   → 'Unable to reach Case Engine'
 *   anything else                                → raw message text
 */
export function classifyApiError(err: unknown): string {
	if (err instanceof TypeError) {
		return 'Unable to reach Case Engine';
	}
	const message = err instanceof Error ? err.message : String(err ?? 'Unknown error');
	const lower = message.toLowerCase();

	if (
		lower.includes('(403)') ||
		lower.includes('access denied') ||
		lower.includes('self-review') ||
		lower.includes('can_approve_ai_proposals') ||
		lower.includes('capability') ||
		lower.includes('forbidden') ||
		lower.includes('not authorized')
	) {
		return 'You are not authorized to review this proposal';
	}

	if (
		lower.includes('(400)') ||
		lower.includes('cannot be') ||
		lower.includes('only pending') ||
		lower.includes('only approved') ||
		lower.includes('no longer') ||
		lower.includes('invalid state') ||
		lower.includes('can no longer')
	) {
		return 'This proposal can no longer be modified';
	}

	if (
		lower.includes('fetch') ||
		lower.includes('network') ||
		lower.includes('econnrefused') ||
		lower.includes('failed to fetch') ||
		lower.includes('load failed') ||
		lower.includes('unable to reach')
	) {
		return 'Unable to reach Case Engine';
	}

	return message || 'An unexpected error occurred';
}

/** Returns the explicit human-readable label for a proposal status. */
export function statusLabel(status: ProposalStatus): string {
	switch (status) {
		case 'pending':
			return 'Pending Review';
		case 'approved':
			return 'Approved — Not Yet Committed';
		case 'rejected':
			return 'Rejected';
		case 'committed':
			return 'Committed to Case';
		default:
			return String(status);
	}
}

/**
 * P41-38 — Operator-visible narrative for document timeline ingest rows: full `text_original`
 * (authoritative excerpt), never a list-preview stub. Used instead of `payloadPreview` + line-clamp
 * for `_ce_document_timeline_intake` payloads.
 */
export function documentTimelineIngestOperatorNarrative(payload: Record<string, unknown>): string {
	const o = String(payload.text_original ?? '').trim();
	if (o.length > 0) return String(payload.text_original ?? '');
	const c = String(payload.text_cleaned ?? '').trim();
	return c.length > 0 ? String(payload.text_cleaned ?? '') : '—';
}

/**
 * Generates a short content preview string from a proposal payload.
 * Truncated to 140 characters for list view.
 */
export function payloadPreview(proposedPayload: string, proposalType: string): string {
	try {
		const payload = JSON.parse(proposedPayload) as Record<string, unknown>;
		let preview = '';
		if (proposalType === 'note') {
			preview = String(payload.content ?? '').trim();
		} else if (proposalType === 'timeline') {
			const parts: string[] = [];
			if (payload.occurred_at) parts.push(String(payload.occurred_at));
			if (payload.type) parts.push(String(payload.type));
			const cleaned = payload.text_cleaned != null ? String(payload.text_cleaned).trim() : '';
			if (cleaned) parts.push(cleaned);
			else if (payload.text_original) parts.push(String(payload.text_original));
			preview = parts.join(' — ');
		} else {
			preview = JSON.stringify(payload);
		}
		return preview.length > 140 ? preview.slice(0, 137) + '…' : preview;
	} catch {
		return proposedPayload.slice(0, 140);
	}
}

/**
 * Returns Tailwind classes for the status badge background + text.
 * Pure — safe to call in template expressions.
 */
export function statusBadgeClasses(status: ProposalStatus): string {
	switch (status) {
		case 'pending':
			return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
		case 'approved':
			return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
		case 'rejected':
			return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
		case 'committed':
			return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
		default:
			return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
	}
}

/**
 * Returns Tailwind classes for a status tab (active vs inactive).
 */
export function tabClasses(tab: ProposalStatus, activeTab: ProposalStatus): string {
	const base = 'px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors';
	if (tab !== activeTab) {
		return `${base} border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300`;
	}
	switch (tab) {
		case 'pending':
			return `${base} border-amber-500 text-amber-700 dark:text-amber-400`;
		case 'approved':
			return `${base} border-blue-500 text-blue-700 dark:text-blue-400`;
		case 'rejected':
			return `${base} border-red-500 text-red-700 dark:text-red-400`;
		case 'committed':
			return `${base} border-green-600 text-green-700 dark:text-green-400`;
		default:
			return `${base} border-gray-500 text-gray-700 dark:text-gray-400`;
	}
}
