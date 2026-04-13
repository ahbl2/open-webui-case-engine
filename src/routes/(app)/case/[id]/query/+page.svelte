<script lang="ts">
	/**
	 * P102-04 — Single-case query (read-only; Case Engine authority).
	 * P102-05 — `{#key caseId}` remount discards in-flight UI state on case switch (defense-in-depth).
	 */
	import { page } from '$app/stores';
	import CaseQueryPanel from '$lib/components/case/CaseQueryPanel.svelte';
	import CaseWorkspaceContentRegion from '$lib/components/case/CaseWorkspaceContentRegion.svelte';
	import { caseEngineToken } from '$lib/stores';

	$: caseId = String($page.params.id ?? '');
</script>

<CaseWorkspaceContentRegion testId="case-query-page">
	<div class="px-3 sm:px-4 pt-3 sm:pt-4 max-w-[960px] mx-auto w-full min-h-0 overflow-auto">
		{#key caseId}
			<CaseQueryPanel caseId={caseId} caseEngineToken={$caseEngineToken ?? ''} />
		{/key}
	</div>
</CaseWorkspaceContentRegion>
