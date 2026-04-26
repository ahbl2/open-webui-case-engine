/**
 * P130 — proposal submit for AI Workspace. Lives under `$lib/case` so `AIWorkspacePanel.svelte`
 * does not reference `$lib/apis/caseEngine` (see p130AIWorkspace.contract.test.ts).
 */
export {
	type CaseProposalCreateResponse,
	createCaseProposalManual
} from '$lib/apis/caseEngine/caseProposalsApi';
