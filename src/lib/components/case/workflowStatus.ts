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
