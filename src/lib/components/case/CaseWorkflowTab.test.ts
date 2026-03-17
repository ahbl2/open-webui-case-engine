/**
 * P13-06: Minimal workflow proposal UI tests.
 * These exercise pure helpers/state logic without mounting Svelte.
 */
import { describe, it, expect, vi } from 'vitest';

import {
	type WorkflowProposal,
	type WorkflowItem
} from '$lib/apis/caseEngine';

// Re-import the helper functions via a direct import of the module under test.
import * as TabModule from './CaseWorkflowTab.svelte';

describe('CaseWorkflowTab helpers', () => {
	it('proposalStatusBadgeClasses returns expected classes for each status', () => {
		const fn = (TabModule as any).proposalStatusBadgeClasses as (s: string) => string;
		expect(fn('PENDING')).toContain('amber');
		expect(fn('ACCEPTED')).toContain('green');
		expect(fn('REJECTED')).toContain('gray');
	});

	it('proposalTypeLabel maps proposal_type to human label', () => {
		const fn = (TabModule as any).proposalTypeLabel as (p: WorkflowProposal) => string;
		const base: WorkflowProposal = {
			id: 'p1',
			case_id: 'c1',
			proposal_type: 'CREATE_HYPOTHESIS',
			status: 'PENDING',
			suggested_payload: null,
			citations: [],
			workflow_item_id: null,
			created_by: 'u1',
			created_at: '2024-01-01T00:00:00Z',
			resolved_at: null,
			resolved_by: null
		};
		expect(fn({ ...base, proposal_type: 'CREATE_HYPOTHESIS' })).toBe('Hypothesis');
		expect(fn({ ...base, proposal_type: 'CREATE_GAP' })).toBe('Gap');
	});

	it('hasWorkflowLink returns true when workflow_item_id is present', () => {
		const fn = (TabModule as any).hasWorkflowLink as (p: WorkflowProposal) => boolean;
		const base: WorkflowProposal = {
			id: 'p1',
			case_id: 'c1',
			proposal_type: 'CREATE_HYPOTHESIS',
			status: 'PENDING',
			suggested_payload: null,
			citations: [],
			workflow_item_id: null,
			created_by: 'u1',
			created_at: '2024-01-01T00:00:00Z',
			resolved_at: null,
			resolved_by: null
		};
		expect(fn(base)).toBe(false);
		expect(fn({ ...base, workflow_item_id: 'w1' })).toBe(true);
	});
});

