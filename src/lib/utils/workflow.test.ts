import { describe, expect, it } from 'vitest';
import type { WorkflowItem, WorkflowProposal } from '$lib/apis/caseEngine';
import {
	detectWorkflowCreateIntent,
	detectWorkflowListIntent,
	formatWorkflowOverviewForChat
} from './workflow';

describe('workflow utils', () => {
	it('detects workflow list intent', () => {
		expect(detectWorkflowListIntent('show workflow items')).toBe(true);
		expect(detectWorkflowListIntent('what workflow proposals are open')).toBe(true);
		expect(detectWorkflowListIntent('show notes')).toBe(false);
	});

	it('detects workflow create intent', () => {
		expect(detectWorkflowCreateIntent('create workflow item')).toBe(true);
		expect(detectWorkflowCreateIntent('add new workflow proposal')).toBe(true);
		expect(detectWorkflowCreateIntent('show workflow items')).toBe(false);
	});

	it('formats a compact chat overview using real API rows', () => {
		const items: WorkflowItem[] = [
			{
				id: 'w1',
				case_id: 'c1',
				type: 'HYPOTHESIS',
				title: 'Check alibi statement',
				description: null,
				status: 'OPEN',
				priority: 1,
				origin: 'INVESTIGATOR',
				citations: [],
				entity_type: null,
				entity_normalized_id: null,
				owner_user_id: null,
				created_by: 'u1',
				created_at: '2026-01-01T00:00:00Z',
				updated_at: '2026-01-01T00:00:00Z',
				deleted_at: null
			},
			{
				id: 'w2',
				case_id: 'c1',
				type: 'GAP',
				title: 'Need surveillance pull',
				description: null,
				status: 'CLOSED',
				priority: null,
				origin: 'INVESTIGATOR',
				citations: [],
				entity_type: null,
				entity_normalized_id: null,
				owner_user_id: null,
				created_by: 'u1',
				created_at: '2026-01-01T00:00:00Z',
				updated_at: '2026-01-01T00:00:00Z',
				deleted_at: null
			}
		];
		const proposals: WorkflowProposal[] = [
			{
				id: 'p1',
				case_id: 'c1',
				proposal_type: 'CREATE_HYPOTHESIS',
				status: 'PENDING',
				suggested_payload: { title: 'Verify timeline contradiction' },
				citations: [],
				workflow_item_id: null,
				created_by: 'u1',
				created_at: '2026-01-01T00:00:00Z',
				resolved_at: null,
				resolved_by: null
			}
		];

		const text = formatWorkflowOverviewForChat(items, proposals, 'c1');
		expect(text).toContain('Here are the current workflow items for this case.');
		expect(text).toContain('Active items: 2');
		expect(text).toContain('Pending proposals: 1');
		expect(text).toContain('View full details in the Workflow tab.');
		expect(text).toContain('/case/c1/workflow');
	});

	it('formats clean empty-state lines for items and proposals', () => {
		const text = formatWorkflowOverviewForChat([], [], 'c-empty');
		expect(text).toContain('No workflow items yet.');
		expect(text).toContain('No workflow proposals.');
		expect(text).toContain('/case/c-empty/workflow');
	});
});
