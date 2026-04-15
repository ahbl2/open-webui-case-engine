/**
 * P127-03 — Display labels for Phase 117 workflow types/status (deterministic; no ranking).
 */
import type { CaseWorkflowItemStatus, CaseWorkflowItemType } from '$lib/apis/caseEngine/caseWorkflowItemsApi';
import {
	P127_WORKFLOW_STATUS_CLOSED,
	P127_WORKFLOW_STATUS_IN_PROGRESS,
	P127_WORKFLOW_STATUS_OPEN,
	P127_WORKFLOW_TYPE_LEAD,
	P127_WORKFLOW_TYPE_TASK
} from '$lib/caseContext/p127WorkflowCreateCopy';

export function p127LabelWorkflowType(t: CaseWorkflowItemType): string {
	return t === 'LEAD' ? P127_WORKFLOW_TYPE_LEAD : P127_WORKFLOW_TYPE_TASK;
}

export function p127LabelWorkflowStatus(s: CaseWorkflowItemStatus): string {
	switch (s) {
		case 'OPEN':
			return P127_WORKFLOW_STATUS_OPEN;
		case 'IN_PROGRESS':
			return P127_WORKFLOW_STATUS_IN_PROGRESS;
		case 'CLOSED':
			return P127_WORKFLOW_STATUS_CLOSED;
		default:
			return s;
	}
}
