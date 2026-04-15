/**
 * P131.5-02 — Explicit Command Center summary counts only (no inference, ranking, or derived “priority”).
 * Pure functions over row arrays returned by existing Command Center GET paths.
 */
import type { CommandCenterActivityRow } from '$lib/case/commandCenterActivity';
import type { CommandCenterCaseRow } from '$lib/case/commandCenterCases';
import type { CommandCenterWorkflowRow } from '$lib/case/commandCenterWorkflow';

/** Number of case rows returned for the current unit scope (same as case list length). */
export function countCasesInScope(rows: CommandCenterCaseRow[]): number {
	return rows.length;
}

/** Count of case rows whose `status` field is exactly `OPEN` (explicit string match only; trim whitespace only). */
export function countOpenCases(rows: CommandCenterCaseRow[]): number {
	let n = 0;
	for (const r of rows) {
		if (String(r.status ?? '').trim() === 'OPEN') n += 1;
	}
	return n;
}

/** Number of activity feed rows returned. */
export function countActivityRows(rows: CommandCenterActivityRow[]): number {
	return rows.length;
}

/**
 * Sum of `total_count` from workflow snapshot rows (explicit per-case GET list lengths from P131-04 module).
 */
export function sumWorkflowItemCounts(rows: CommandCenterWorkflowRow[]): number {
	let sum = 0;
	for (const r of rows) {
		const n = r.total_count;
		if (typeof n === 'number' && Number.isFinite(n)) sum += n;
	}
	return sum;
}
