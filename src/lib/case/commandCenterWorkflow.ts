/**
 * P131-04 — Command Center workflow snapshot: GET-only counts per case.
 * P132-03 — Counts are from returned workflow items only; same case list as `fetchCommandCenterCaseRows`.
 *
 * Row order matches `fetchCommandCenterCaseRows` (P131-02): last Timeline occurred_at descending,
 * not workflow counts.
 */
import {
	listCaseWorkflowItems,
	type CaseEngineCaseWorkflowItem
} from '$lib/apis/caseEngine/caseWorkflowItemsApi';
import { fetchCommandCenterCaseRows, type CommandCenterCaseRow } from './commandCenterCases';

export type CommandCenterWorkflowRow = {
	case_id: string;
	case_identifier: string;
	/** Length of array returned by GET list (no client-side exclusion). */
	total_count: number;
	/** Tallies by raw `status` string from each item (OPEN | IN_PROGRESS | CLOSED). */
	status_tallies: Record<string, number>;
};

function caseIdentifierFromCaseRow(r: CommandCenterCaseRow): string {
	const n = r.case_number?.trim();
	if (n) return n;
	return r.case_id;
}

/**
 * Direct tally of `status` field values; keys are exactly as stored on items.
 */
export function tallyWorkflowStatuses(items: CaseEngineCaseWorkflowItem[]): Record<string, number> {
	const out: Record<string, number> = {};
	for (const w of items) {
		const s = String(w.status);
		out[s] = (out[s] ?? 0) + 1;
	}
	return out;
}

/**
 * Workflow snapshot rows for already-built case list rows (same order as Case List).
 * Any `listCaseWorkflowItems` failure fails the whole load (no partial counts).
 */
export async function buildCommandCenterWorkflowRowsFromCaseRows(
	caseRows: CommandCenterCaseRow[],
	token: string
): Promise<CommandCenterWorkflowRow[]> {
	const out: CommandCenterWorkflowRow[] = [];
	for (const r of caseRows) {
		const items = await listCaseWorkflowItems(r.case_id, token);
		const status_tallies = tallyWorkflowStatuses(items);
		out.push({
			case_id: r.case_id,
			case_identifier: caseIdentifierFromCaseRow(r),
			total_count: items.length,
			status_tallies
		});
	}
	return out;
}

/**
 * Same case order as Case List: `fetchCommandCenterCaseRows` then per case GET workflow items.
 */
export async function fetchCommandCenterWorkflowRows(
	token: string,
	unit: 'CID' | 'SIU' | 'ALL'
): Promise<CommandCenterWorkflowRow[]> {
	const caseRows = await fetchCommandCenterCaseRows(token, unit);
	return buildCommandCenterWorkflowRowsFromCaseRows(caseRows, token);
}
