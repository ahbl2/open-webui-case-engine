<script lang="ts">
	// CRITICAL: Tasks are operational-only and NON-AUTHORITATIVE vs Timeline.
	// They must NEVER directly or indirectly cause any mutation of timeline_entries.
	//
	/**
	 * P86-01 — Tasks / Leads (operational only)
	 * P86-05 — Tier L shell + tasks tab.
	 * P89-07 — `CaseTasksPanel` loads/writes persisted Tasks via Case Engine (`case_tasks`); still not Timeline.
	 */
	import { page } from '$app/stores';
	import CaseAiProposalDraftPanel from '$lib/components/case/CaseAiProposalDraftPanel.svelte';
	import CaseTasksPanel from '$lib/components/case/CaseTasksPanel.svelte';
	import CaseWorkspaceContentRegion from '$lib/components/case/CaseWorkspaceContentRegion.svelte';
	import { caseEngineToken } from '$lib/stores';

	$: caseId = String($page.params.id ?? '');
</script>

<CaseWorkspaceContentRegion testId="case-tasks-page">
	<div class="px-3 sm:px-4 pt-3 sm:pt-4 max-w-[1200px] mx-auto w-full">
		<CaseAiProposalDraftPanel
			caseId={caseId}
			caseEngineToken={$caseEngineToken ?? ''}
			defaultProposalType="task"
			surfaceLabel="Tasks"
		/>
	</div>
	<CaseTasksPanel />
</CaseWorkspaceContentRegion>
