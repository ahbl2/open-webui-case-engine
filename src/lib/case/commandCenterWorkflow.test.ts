/**
 * P131-04 — Tally accuracy; total equals sum of status tallies.
 */
import { describe, expect, it } from 'vitest';
import type { CaseEngineCaseWorkflowItem } from '$lib/apis/caseEngine/caseWorkflowItemsApi';
import { tallyWorkflowStatuses } from './commandCenterWorkflow';

function item(status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED'): CaseEngineCaseWorkflowItem {
	return {
		workflow_item_id: 'w1',
		case_id: 'c1',
		workflow_type: 'TASK',
		title: 't',
		description: null,
		status,
		created_at: '',
		created_by: '',
		updated_at: '',
		updated_by: '',
		deleted_at: null
	};
}

describe('commandCenterWorkflow', () => {
	it('tallyWorkflowStatuses counts each status exactly', () => {
		const items = [item('OPEN'), item('OPEN'), item('CLOSED'), item('IN_PROGRESS')];
		const t = tallyWorkflowStatuses(items);
		expect(t.OPEN).toBe(2);
		expect(t.CLOSED).toBe(1);
		expect(t.IN_PROGRESS).toBe(1);
		expect(Object.keys(t).sort()).toEqual(['CLOSED', 'IN_PROGRESS', 'OPEN'].sort());
		const sum = Object.values(t).reduce((a, b) => a + b, 0);
		expect(sum).toBe(items.length);
	});

	it('tallyWorkflowStatuses empty array yields empty object', () => {
		expect(tallyWorkflowStatuses([])).toEqual({});
	});
});
