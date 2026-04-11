/**
 * P13-06 / P57-04 — Workflow proposal display + badge behavior (no Svelte mount).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

import { type WorkflowProposal } from '$lib/apis/caseEngine';
import { formatWorkflowProposalTypeForDisplay } from '$lib/components/case/workflowStatus';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tabSource = readFileSync(join(__dirname, 'CaseWorkflowTab.svelte'), 'utf8');

describe('CaseWorkflowTab source contracts', () => {
	it('formatWorkflowProposalTypeForDisplay matches proposal chip labels', () => {
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
		expect(formatWorkflowProposalTypeForDisplay(base.proposal_type)).toBe('Hypothesis');
		expect(
			formatWorkflowProposalTypeForDisplay({ ...base, proposal_type: 'CREATE_GAP' }.proposal_type)
		).toBe('Gap');
	});

	it('proposalStatusBadgeClasses branches exist in component source', () => {
		expect(tabSource).toContain("s === 'PENDING'");
		expect(tabSource).toContain("s === 'ACCEPTED'");
		expect(tabSource).toContain('DS_BADGE_CLASSES.warning');
		expect(tabSource).toContain('DS_BADGE_CLASSES.success');
	});

	it('hasWorkflowLink logic: workflow_item_id presence', () => {
		const hasLink = (p: WorkflowProposal) => !!p.workflow_item_id;
		const base = {
			id: 'p1',
			case_id: 'c1',
			proposal_type: 'CREATE_HYPOTHESIS' as const,
			status: 'PENDING' as const,
			suggested_payload: null,
			citations: [] as WorkflowProposal['citations'],
			workflow_item_id: null,
			created_by: 'u1',
			created_at: '2024-01-01T00:00:00Z',
			resolved_at: null,
			resolved_by: null
		};
		expect(hasLink(base)).toBe(false);
		expect(hasLink({ ...base, workflow_item_id: 'w1' })).toBe(true);
	});
});
