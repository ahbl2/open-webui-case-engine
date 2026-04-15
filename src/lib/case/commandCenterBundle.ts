/**
 * P131.5-02 — Single `listCases` call for Command Center dashboard + summary (no redundant list fetch).
 * GET-only; same semantics as separate `fetchCommandCenter*` helpers, with aligned partial failure handling.
 */
import { listCases } from '$lib/apis/caseEngine';
import { P132_COMMAND_CENTER_GENERIC_LOAD_ERROR } from '$lib/case/p131CommandCenterCopy';
import { buildCommandCenterActivityRowsFromCases, type CommandCenterActivityRow } from '$lib/case/commandCenterActivity';
import { buildCommandCenterCaseRowsFromCases, type CommandCenterCaseRow } from '$lib/case/commandCenterCases';
import { buildCommandCenterWorkflowRowsFromCaseRows, type CommandCenterWorkflowRow } from '$lib/case/commandCenterWorkflow';

export type CommandCenterDashboardBundle = {
	caseRows: CommandCenterCaseRow[];
	activityRows: CommandCenterActivityRow[];
	workflowRows: CommandCenterWorkflowRow[];
	caseLoadError: string | null;
	activityLoadError: string | null;
	workflowLoadError: string | null;
};

/**
 * Loads case list, activity, and workflow snapshot sharing one `listCases` result.
 * If case-row build fails, workflow is not attempted (depends on case list ordering).
 */
export async function loadCommandCenterDashboardBundle(
	token: string,
	unit: 'CID' | 'SIU' | 'ALL'
): Promise<CommandCenterDashboardBundle> {
	let caseRows: CommandCenterCaseRow[] = [];
	let activityRows: CommandCenterActivityRow[] = [];
	let workflowRows: CommandCenterWorkflowRow[] = [];
	let caseLoadError: string | null = null;
	let activityLoadError: string | null = null;
	let workflowLoadError: string | null = null;

	try {
		const cases = await listCases(unit, token);
		const [cr, ar] = await Promise.allSettled([
			buildCommandCenterCaseRowsFromCases(cases, token),
			buildCommandCenterActivityRowsFromCases(cases, token)
		]);

		if (cr.status === 'fulfilled') {
			caseRows = cr.value;
		} else {
			caseLoadError = P132_COMMAND_CENTER_GENERIC_LOAD_ERROR;
		}
		if (ar.status === 'fulfilled') {
			activityRows = ar.value;
		} else {
			activityLoadError = P132_COMMAND_CENTER_GENERIC_LOAD_ERROR;
		}

		if (cr.status === 'fulfilled') {
			const wf = await Promise.allSettled([buildCommandCenterWorkflowRowsFromCaseRows(cr.value, token)]);
			if (wf[0].status === 'fulfilled') {
				workflowRows = wf[0].value;
			} else {
				workflowLoadError = P132_COMMAND_CENTER_GENERIC_LOAD_ERROR;
			}
		} else {
			workflowLoadError = P132_COMMAND_CENTER_GENERIC_LOAD_ERROR;
		}
	} catch {
		caseLoadError = P132_COMMAND_CENTER_GENERIC_LOAD_ERROR;
		activityLoadError = P132_COMMAND_CENTER_GENERIC_LOAD_ERROR;
		workflowLoadError = P132_COMMAND_CENTER_GENERIC_LOAD_ERROR;
	}

	return {
		caseRows,
		activityRows,
		workflowRows,
		caseLoadError,
		activityLoadError,
		workflowLoadError
	};
}
