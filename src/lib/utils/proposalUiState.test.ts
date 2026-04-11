/**
 * P19-10 — Proposal UI State Tests
 *
 * Validates the pure utility functions that drive the proposal review UI.
 * No API calls, no Svelte, no stores.
 */
import { describe, it, expect } from 'vitest';
import {
	getAllowedActions,
	canApprove,
	canReject,
	canCommit,
	isBulkCommitEnabled,
	isBulkApproveEnabled,
	isBulkRejectEnabled,
	classifyApiError,
	groupByStatus,
	statusLabel,
	payloadPreview,
	documentTimelineIngestOperatorNarrative,
	statusBadgeClasses,
	tabClasses,
	normalizeProposalPayloadChronologyConfidence,
	timelineProposalCommitBlockedByLowChronology,
	getBulkApprovePendingTargets,
	getBulkCommitApprovedTargets,
	summarizeProposalQueueMix,
	formatProposalQueueMixSummary,
	bulkCommitSelectionBlockedReason
} from './proposalUiState';
import type { ProposalRecord } from '$lib/apis/caseEngine';

// ─── Minimal proposal factory ──────────────────────────────────────────────────

function makeProposal(
	id: string,
	status: ProposalRecord['status'],
	extra: Partial<ProposalRecord> = {}
): ProposalRecord {
	return {
		id,
		case_id: 'case-1',
		source_scope: 'case',
		source_thread_id: 'thread-1',
		source_message_id: null,
		proposal_type: 'note',
		proposed_payload: JSON.stringify({ content: 'Test content' }),
		status,
		created_by: 'user-1',
		created_at: '2024-01-01T00:00:00Z',
		reviewed_by: null,
		reviewed_at: null,
		committed_at: null,
		committed_record_id: null,
		rejection_reason: null,
		...extra
	};
}

function makeTimelineProposal(
	id: string,
	status: ProposalRecord['status'],
	payload: Record<string, unknown>
): ProposalRecord {
	return makeProposal(id, status, {
		proposal_type: 'timeline',
		proposed_payload: JSON.stringify(payload)
	});
}

// ─── getAllowedActions ─────────────────────────────────────────────────────────

describe('getAllowedActions', () => {
	it('pending allows approve and reject only', () => {
		const actions = getAllowedActions('pending');
		expect(actions).toContain('approve');
		expect(actions).toContain('reject');
		expect(actions).not.toContain('commit');
	});

	it('approved allows commit only', () => {
		const actions = getAllowedActions('approved');
		expect(actions).toContain('commit');
		expect(actions).not.toContain('approve');
		expect(actions).not.toContain('reject');
	});

	it('rejected allows no actions', () => {
		expect(getAllowedActions('rejected')).toHaveLength(0);
	});

	it('committed allows no actions', () => {
		expect(getAllowedActions('committed')).toHaveLength(0);
	});
});

// ─── canApprove / canReject / canCommit ───────────────────────────────────────

describe('canApprove / canReject / canCommit', () => {
	it('canApprove: true for pending, false for others', () => {
		expect(canApprove('pending')).toBe(true);
		expect(canApprove('approved')).toBe(false);
		expect(canApprove('rejected')).toBe(false);
		expect(canApprove('committed')).toBe(false);
	});

	it('canReject: true for pending, false for others', () => {
		expect(canReject('pending')).toBe(true);
		expect(canReject('approved')).toBe(false);
		expect(canReject('rejected')).toBe(false);
		expect(canReject('committed')).toBe(false);
	});

	it('canCommit: true for approved, false for others', () => {
		expect(canCommit('approved')).toBe(true);
		expect(canCommit('pending')).toBe(false);
		expect(canCommit('rejected')).toBe(false);
		expect(canCommit('committed')).toBe(false);
	});
});

// ─── isBulkCommitEnabled ──────────────────────────────────────────────────────

describe('isBulkCommitEnabled', () => {
	it('returns false for empty selection', () => {
		const proposals = [makeProposal('a', 'approved')];
		expect(isBulkCommitEnabled(new Set(), proposals)).toBe(false);
	});

	it('returns true when all selected proposals are approved', () => {
		const proposals = [makeProposal('a', 'approved'), makeProposal('b', 'approved')];
		expect(isBulkCommitEnabled(new Set(['a', 'b']), proposals)).toBe(true);
	});

	it('returns false when any selected proposal is pending', () => {
		const proposals = [makeProposal('a', 'approved'), makeProposal('b', 'pending')];
		expect(isBulkCommitEnabled(new Set(['a', 'b']), proposals)).toBe(false);
	});

	it('returns false when any selected proposal is committed', () => {
		const proposals = [makeProposal('a', 'approved'), makeProposal('b', 'committed')];
		expect(isBulkCommitEnabled(new Set(['a', 'b']), proposals)).toBe(false);
	});

	it('returns false when any selected proposal is rejected', () => {
		const proposals = [makeProposal('a', 'approved'), makeProposal('b', 'rejected')];
		expect(isBulkCommitEnabled(new Set(['a', 'b']), proposals)).toBe(false);
	});

	it('returns false when selected id is not in proposals list', () => {
		const proposals = [makeProposal('a', 'approved')];
		expect(isBulkCommitEnabled(new Set(['a', 'unknown-id']), proposals)).toBe(false);
	});

	it('returns true for single approved proposal', () => {
		const proposals = [makeProposal('x', 'approved')];
		expect(isBulkCommitEnabled(new Set(['x']), proposals)).toBe(true);
	});

	it('returns false when a selected approved timeline has low chronology without operator confirmation (P40-03)', () => {
		const low = makeTimelineProposal('low', 'approved', {
			occurred_at: '2024-01-01T00:00:00.000Z',
			occurred_at_confidence: 'low'
		});
		const ok = makeProposal('ok', 'approved');
		expect(isBulkCommitEnabled(new Set(['low', 'ok']), [low, ok])).toBe(false);
	});
});

// ─── isBulkApproveEnabled ─────────────────────────────────────────────────────

describe('isBulkApproveEnabled', () => {
	it('returns false for empty selection', () => {
		const proposals = [makeProposal('a', 'pending')];
		expect(isBulkApproveEnabled(new Set(), proposals)).toBe(false);
	});

	it('returns true when at least one selected proposal is pending', () => {
		const proposals = [makeProposal('a', 'approved'), makeProposal('b', 'pending')];
		expect(isBulkApproveEnabled(new Set(['a', 'b']), proposals)).toBe(true);
	});

	it('returns true when all selected proposals are pending', () => {
		const proposals = [makeProposal('a', 'pending'), makeProposal('b', 'pending')];
		expect(isBulkApproveEnabled(new Set(['a', 'b']), proposals)).toBe(true);
	});

	it('returns false when all selected proposals are non-pending', () => {
		const proposals = [makeProposal('a', 'approved'), makeProposal('b', 'committed')];
		expect(isBulkApproveEnabled(new Set(['a', 'b']), proposals)).toBe(false);
	});

	it('returns false when no selected ids match proposals', () => {
		const proposals = [makeProposal('a', 'pending')];
		expect(isBulkApproveEnabled(new Set(['unknown']), proposals)).toBe(false);
	});
});

// ─── isBulkRejectEnabled ──────────────────────────────────────────────────────

describe('isBulkRejectEnabled', () => {
	it('same rule as isBulkApproveEnabled — at least one pending in selection', () => {
		const proposals = [makeProposal('a', 'pending'), makeProposal('b', 'approved')];
		expect(isBulkRejectEnabled(new Set(['a', 'b']), proposals)).toBe(true);
		expect(isBulkRejectEnabled(new Set(['b']), proposals)).toBe(false);
		expect(isBulkRejectEnabled(new Set(), proposals)).toBe(false);
	});
});

// ─── P40-03 chronology helpers ────────────────────────────────────────────────

describe('P40-03 chronology helpers', () => {
	it('normalizeProposalPayloadChronologyConfidence defaults unknown to medium when occurred_at is set', () => {
		expect(
			normalizeProposalPayloadChronologyConfidence({
				occurred_at: '2024-01-01T00:00:00.000Z'
			})
		).toBe('medium');
	});

	it('timelineProposalCommitBlockedByLowChronology is true for low without confirmation', () => {
		const p = makeTimelineProposal('p', 'approved', {
			occurred_at: '2024-01-01T00:00:00.000Z',
			occurred_at_confidence: 'low'
		});
		expect(timelineProposalCommitBlockedByLowChronology(p)).toBe(true);
	});

	it('timelineProposalCommitBlockedByLowChronology is false when operator confirmed', () => {
		const p = makeTimelineProposal('p', 'approved', {
			occurred_at: '2024-01-01T00:00:00.000Z',
			occurred_at_confidence: 'low',
			operator_occurred_at_confirmed: true
		});
		expect(timelineProposalCommitBlockedByLowChronology(p)).toBe(false);
	});
});

// ─── P40-05 bulk targets + queue mix + blocked reasons ───────────────────────

describe('P40-05 bulk targets', () => {
	it('getBulkApprovePendingTargets returns only pending ids in selection order', () => {
		const proposals = [
			makeProposal('a', 'pending'),
			makeProposal('b', 'approved'),
			makeProposal('c', 'pending')
		];
		expect(getBulkApprovePendingTargets(new Set(['c', 'a', 'b']), proposals)).toEqual(['c', 'a']);
	});

	it('getBulkCommitApprovedTargets returns approved ids in selection order', () => {
		const proposals = [
			makeProposal('a', 'approved'),
			makeProposal('b', 'pending'),
			makeProposal('c', 'approved')
		];
		expect(getBulkCommitApprovedTargets(new Set(['c', 'a', 'b']), proposals)).toEqual(['c', 'a']);
	});
});

describe('P40-05 summarizeProposalQueueMix / formatProposalQueueMixSummary', () => {
	it('splits approved into ready vs chronology-blocked timeline', () => {
		const proposals = [
			makeTimelineProposal('low', 'approved', {
				occurred_at: '2024-01-01T00:00:00.000Z',
				occurred_at_confidence: 'low'
			}),
			makeTimelineProposal('ok', 'approved', {
				occurred_at: '2024-01-02T00:00:00.000Z',
				occurred_at_confidence: 'high'
			}),
			makeProposal('n', 'pending')
		];
		const s = summarizeProposalQueueMix(proposals);
		expect(s.pending).toBe(1);
		expect(s.approvedReadyToCommit).toBe(1);
		expect(s.approvedBlockedChronology).toBe(1);
		const line = formatProposalQueueMixSummary(s);
		expect(line).toContain('1 pending review');
		expect(line).toContain('2 approved');
		expect(line).toContain('1 ready');
		expect(line).toContain('1 need chronology');
	});

	it('rejected wording distinguishes from pending', () => {
		const proposals = [makeProposal('r', 'rejected'), makeProposal('p', 'pending')];
		const line = formatProposalQueueMixSummary(summarizeProposalQueueMix(proposals));
		expect(line).toContain('rejected (excluded from review queue)');
		expect(line).toContain('pending review');
	});
});

describe('P40-05 bulkCommitSelectionBlockedReason', () => {
	it('returns null when selection is committable', () => {
		const proposals = [makeProposal('a', 'approved'), makeProposal('b', 'approved')];
		expect(bulkCommitSelectionBlockedReason(new Set(['a', 'b']), proposals)).toBe(null);
	});

	it('explains mixed chronology-blocked and not-approved', () => {
		const low = makeTimelineProposal('low', 'approved', {
			occurred_at: '2024-01-01T00:00:00.000Z',
			occurred_at_confidence: 'low'
		});
		const proposals = [low, makeProposal('pen', 'pending')];
		const msg = bulkCommitSelectionBlockedReason(new Set(['low', 'pen']), proposals);
		expect(msg).toContain('chronology');
		expect(msg).toContain('not approved');
	});

	it('flags unknown id in selection', () => {
		const proposals = [makeProposal('a', 'approved')];
		expect(bulkCommitSelectionBlockedReason(new Set(['a', 'ghost']), proposals)).toContain('unknown');
	});
});

// ─── classifyApiError ─────────────────────────────────────────────────────────

describe('classifyApiError', () => {
	it('maps TypeError to Unable to reach Case Engine', () => {
		expect(classifyApiError(new TypeError('Failed to fetch'))).toBe(
			'Unable to reach Case Engine'
		);
	});

	it('maps (403) in message to authorization error', () => {
		expect(classifyApiError(new Error('Failed (403)'))).toBe(
			'You are not authorized to review this proposal'
		);
	});

	it('maps "Access denied" to authorization error', () => {
		expect(classifyApiError(new Error('Access denied: self-review is forbidden'))).toBe(
			'You are not authorized to review this proposal'
		);
	});

	it('maps "can_approve_ai_proposals" capability mention to authorization error', () => {
		expect(
			classifyApiError(new Error('can_approve_ai_proposals capability required'))
		).toBe('You are not authorized to review this proposal');
	});

	it('maps "self-review" to authorization error', () => {
		expect(classifyApiError(new Error('self-review is forbidden'))).toBe(
			'You are not authorized to review this proposal'
		);
	});

	it('maps (400) to cannot be modified', () => {
		expect(classifyApiError(new Error('Failed (400)'))).toBe(
			'This proposal can no longer be modified'
		);
	});

	it('maps "cannot be approved" lifecycle message to cannot be modified', () => {
		expect(classifyApiError(new Error("Proposal 'xyz' cannot be approved: status is 'rejected'"))).toBe(
			'This proposal can no longer be modified'
		);
	});

	it('maps "Only approved proposals" message to cannot be modified', () => {
		expect(classifyApiError(new Error('Only approved proposals may be committed'))).toBe(
			'This proposal can no longer be modified'
		);
	});

	it('maps "failed to fetch" (network) to Unable to reach', () => {
		expect(classifyApiError(new Error('Failed to fetch'))).toBe('Unable to reach Case Engine');
	});

	it('maps ECONNREFUSED to Unable to reach', () => {
		expect(classifyApiError(new Error('ECONNREFUSED'))).toBe('Unable to reach Case Engine');
	});

	it('passes through unknown errors as-is', () => {
		const msg = 'Something completely unexpected happened';
		expect(classifyApiError(new Error(msg))).toBe(msg);
	});

	it('handles non-Error string input', () => {
		const result = classifyApiError('plain string error');
		expect(result).toBe('plain string error');
	});

	it('handles null/undefined gracefully', () => {
		const result = classifyApiError(null);
		expect(typeof result).toBe('string');
		expect(result.length).toBeGreaterThan(0);
	});

	it('is case-insensitive for "access denied"', () => {
		expect(classifyApiError(new Error('ACCESS DENIED: capability required'))).toBe(
			'You are not authorized to review this proposal'
		);
	});
});

// ─── groupByStatus ────────────────────────────────────────────────────────────

describe('groupByStatus', () => {
	it('groups proposals into all four buckets', () => {
		const proposals = [
			makeProposal('p1', 'pending'),
			makeProposal('p2', 'pending'),
			makeProposal('a1', 'approved'),
			makeProposal('r1', 'rejected'),
			makeProposal('c1', 'committed'),
			makeProposal('c2', 'committed')
		];
		const grouped = groupByStatus(proposals);
		expect(grouped.pending).toHaveLength(2);
		expect(grouped.approved).toHaveLength(1);
		expect(grouped.rejected).toHaveLength(1);
		expect(grouped.committed).toHaveLength(2);
	});

	it('returns empty arrays for missing statuses', () => {
		const proposals = [makeProposal('a', 'pending')];
		const grouped = groupByStatus(proposals);
		expect(grouped.approved).toHaveLength(0);
		expect(grouped.rejected).toHaveLength(0);
		expect(grouped.committed).toHaveLength(0);
	});

	it('returns all empty for empty input', () => {
		const grouped = groupByStatus([]);
		expect(grouped.pending).toHaveLength(0);
		expect(grouped.approved).toHaveLength(0);
		expect(grouped.rejected).toHaveLength(0);
		expect(grouped.committed).toHaveLength(0);
	});
});

// ─── statusLabel ──────────────────────────────────────────────────────────────

describe('statusLabel', () => {
	it('returns correct labels for all statuses', () => {
		expect(statusLabel('pending')).toBe('Pending Review');
		expect(statusLabel('approved')).toBe('Approved — Not Yet Committed');
		expect(statusLabel('rejected')).toBe('Rejected');
		expect(statusLabel('committed')).toBe('Committed to Case');
	});
});

// ─── documentTimelineIngestOperatorNarrative (P41-38) ─────────────────────────

describe('documentTimelineIngestOperatorNarrative', () => {
	it('returns full text_original without truncation for long paragraphs', () => {
		const long = 'A'.repeat(400);
		const payload = { text_original: long, text_cleaned: long };
		expect(documentTimelineIngestOperatorNarrative(payload)).toBe(long);
		expect(documentTimelineIngestOperatorNarrative(payload).length).toBe(400);
	});

	it('falls back to text_cleaned when text_original is empty', () => {
		const payload = { text_original: '   ', text_cleaned: 'Fallback body.' };
		expect(documentTimelineIngestOperatorNarrative(payload)).toBe('Fallback body.');
	});

	it('returns em dash when both bodies missing', () => {
		expect(documentTimelineIngestOperatorNarrative({})).toBe('—');
	});
});

// ─── payloadPreview ───────────────────────────────────────────────────────────

describe('payloadPreview', () => {
	it('extracts content field for note type', () => {
		const payload = JSON.stringify({ content: 'Suspect observed near the warehouse.' });
		expect(payloadPreview(payload, 'note')).toBe('Suspect observed near the warehouse.');
	});

	it('builds joined preview for timeline type', () => {
		const payload = JSON.stringify({
			occurred_at: '2024-03-15T09:30:00Z',
			type: 'OBSERVATION',
			text_original: 'Suspect photographed at Market St.'
		});
		const preview = payloadPreview(payload, 'timeline');
		expect(preview).toContain('2024-03-15T09:30:00Z');
		expect(preview).toContain('OBSERVATION');
		expect(preview).toContain('Suspect photographed at Market St.');
	});

	it('truncates long content to 140 characters', () => {
		const longContent = 'A'.repeat(200);
		const payload = JSON.stringify({ content: longContent });
		const preview = payloadPreview(payload, 'note');
		expect(preview.length).toBeLessThanOrEqual(140);
		expect(preview).toContain('…');
	});

	it('does not truncate content under 140 chars', () => {
		const shortContent = 'Short note.';
		const payload = JSON.stringify({ content: shortContent });
		const preview = payloadPreview(payload, 'note');
		expect(preview).toBe(shortContent);
		expect(preview).not.toContain('…');
	});

	it('handles invalid JSON gracefully', () => {
		const preview = payloadPreview('not valid json', 'note');
		expect(typeof preview).toBe('string');
		expect(preview.length).toBeGreaterThan(0);
	});

	it('handles empty content field', () => {
		const payload = JSON.stringify({ content: '' });
		const preview = payloadPreview(payload, 'note');
		expect(preview).toBe('');
	});

	it('falls back to JSON.stringify for unknown proposal type', () => {
		const payload = JSON.stringify({ foo: 'bar' });
		const preview = payloadPreview(payload, 'unknown_type');
		expect(preview).toContain('foo');
	});
});

// ─── statusBadgeClasses ───────────────────────────────────────────────────────

describe('statusBadgeClasses', () => {
	it('returns a non-empty string for every status', () => {
		for (const status of ['pending', 'approved', 'rejected', 'committed'] as const) {
			const classes = statusBadgeClasses(status);
			expect(typeof classes).toBe('string');
			expect(classes.length).toBeGreaterThan(0);
		}
	});

	it('pending maps to DS warning badge', () => {
		expect(statusBadgeClasses('pending')).toContain('ds-badge-warning');
	});

	it('approved maps to DS info badge', () => {
		expect(statusBadgeClasses('approved')).toContain('ds-badge-info');
	});

	it('rejected maps to DS danger badge', () => {
		expect(statusBadgeClasses('rejected')).toContain('ds-badge-danger');
	});

	it('committed maps to DS success badge', () => {
		expect(statusBadgeClasses('committed')).toContain('ds-badge-success');
	});
});

// ─── tabClasses ───────────────────────────────────────────────────────────────

describe('tabClasses', () => {
	it('returns different classes for active vs inactive tab', () => {
		const active = tabClasses('pending', 'pending');
		const inactive = tabClasses('pending', 'approved');
		expect(active).not.toBe(inactive);
	});

	it('active pending tab uses DS active-pending modifier', () => {
		expect(tabClasses('pending', 'pending')).toContain('ds-proposals-tab--active-pending');
	});

	it('active committed tab uses DS active-committed modifier', () => {
		expect(tabClasses('committed', 'committed')).toContain('ds-proposals-tab--active-committed');
	});

	it('inactive tab uses inactive modifier', () => {
		expect(tabClasses('pending', 'approved')).toContain('ds-proposals-tab--inactive');
	});

	it('P45-03 — inactive rejected tab uses muted modifier vs other inactive tabs', () => {
		const inactiveRejected = tabClasses('rejected', 'pending');
		const inactivePending = tabClasses('pending', 'approved');
		expect(inactiveRejected).toContain('ds-proposals-tab--inactive-muted');
		expect(inactivePending).toContain('ds-proposals-tab--inactive');
		expect(inactivePending).not.toContain('inactive-muted');
	});

	it('P45-03 — active rejected tab uses active-rejected modifier', () => {
		const active = tabClasses('rejected', 'rejected');
		expect(active).toContain('ds-proposals-tab--active-rejected');
	});
});
