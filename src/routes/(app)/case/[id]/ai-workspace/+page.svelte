<script lang="ts">
	/**
	 * P130-01 — AI Workspace route shell (framing + stub UI only; no assistant execution).
	 */
	import { page } from '$app/stores';
	import CaseWorkspaceContentRegion from '$lib/components/case/CaseWorkspaceContentRegion.svelte';
	import AIWorkspacePanel from '$lib/components/case/AIWorkspacePanel.svelte';
	import { getRouteCaseIdString } from '$lib/caseContext/routeCaseContext';

	$: routeCaseId = getRouteCaseIdString($page.params);
</script>

<CaseWorkspaceContentRegion testId="case-ai-workspace-page">
	<AIWorkspacePanel caseId={routeCaseId} />
</CaseWorkspaceContentRegion>
