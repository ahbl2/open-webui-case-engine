/**
 * P13-05: Type-aware workflow status options.
 * Matches backend workflowItemService STATUS_BY_TYPE (HYPOTHESIS / GAP).
 * Single shared mapping so UI never presents invalid statuses.
 */
export type WorkflowItemType = 'HYPOTHESIS' | 'GAP';

export const WORKFLOW_STATUS_BY_TYPE: Record<WorkflowItemType, readonly string[]> = {
	HYPOTHESIS: ['OPEN', 'IN_PROGRESS', 'SUPPORTED', 'REJECTED', 'CLOSED'],
	GAP: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
} as const;

export function getStatusesForType(type: WorkflowItemType): string[] {
	return [...WORKFLOW_STATUS_BY_TYPE[type]];
}

export function isValidStatusForType(type: WorkflowItemType, status: string): boolean {
	return WORKFLOW_STATUS_BY_TYPE[type].includes(status.toUpperCase());
}

export function getStatusBadgeClasses(status: string): string {
	const s = status.toUpperCase();
	if (s === 'IN_PROGRESS' || s === 'ASSIGNED') {
		return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200';
	}
	if (s === 'SUPPORTED' || s === 'RESOLVED') {
		return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200';
	}
	if (s === 'REJECTED') {
		return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
	}
	// OPEN / CLOSED / anything else → neutral
	return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200';
}

export function getOriginBadgeClasses(origin: string): string {
	const o = origin.toUpperCase();
	if (o === 'PROPOSAL') {
		return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200';
	}
	// INVESTIGATOR or anything else → subtle neutral
	return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200';
}

export function getPriorityEmoji(priority: number | null | undefined): string | null {
	if (priority == null) return null;
	if (priority >= 3) return '🔴';
	if (priority === 2) return '🟠';
	if (priority === 1) return '🟡';
	return null;
}

/**
 * P57-04: Human-readable operator labels only — internal enum / API values unchanged.
 * SCREAMING_SNAKE → Title words (e.g. IN_PROGRESS → In Progress).
 */
export function humanizeWorkflowScreamingSnake(raw: string): string {
	if (!raw) return raw;
	return raw
		.split(/_+/)
		.filter(Boolean)
		.map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase())
		.join(' ');
}

/** Workflow item type column / filter-adjacent copy (values remain HYPOTHESIS | GAP). */
export function formatWorkflowItemTypeForDisplay(type: string): string {
	const t = (type || '').toUpperCase();
	if (t === 'HYPOTHESIS') return 'Hypothesis';
	if (t === 'GAP') return 'Gap';
	return humanizeWorkflowScreamingSnake(type);
}

/** Workflow item status (and workflow proposal status where shown the same way). */
export function formatWorkflowStatusForDisplay(status: string): string {
	return humanizeWorkflowScreamingSnake(status);
}

/** Workflow item origin badge copy (INVESTIGATOR | PROPOSAL). */
export function formatWorkflowOriginForDisplay(origin: string): string {
	const o = (origin || '').toUpperCase();
	if (o === 'INVESTIGATOR') return 'Investigator';
	if (o === 'PROPOSAL') return 'Proposal';
	return humanizeWorkflowScreamingSnake(origin);
}

/** Workflow proposal `proposal_type` when not CREATE_HYPOTHESIS / CREATE_GAP. */
export function formatWorkflowProposalTypeForDisplay(proposalType: string): string {
	const p = (proposalType || '').toUpperCase();
	if (p === 'CREATE_HYPOTHESIS') return 'Hypothesis';
	if (p === 'CREATE_GAP') return 'Gap';
	return humanizeWorkflowScreamingSnake(proposalType);
}
