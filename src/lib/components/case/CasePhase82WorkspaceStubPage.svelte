<script lang="ts">
	/**
	 * P82-01 — Placeholder surface for routes stubbed in Phase 82 (no API calls; static copy only).
	 */
	import CaseWorkspaceContentRegion from '$lib/components/case/CaseWorkspaceContentRegion.svelte';

	export let pageTitle: string;
	export let testId: string;
</script>

<CaseWorkspaceContentRegion testId={testId}>
	<div class="flex flex-col gap-2 p-4">
		<h1 class="text-lg font-semibold text-[color:var(--ce-l-text-primary)]">{pageTitle}</h1>
		<p class="text-sm text-[color:var(--ce-l-text-secondary)]">Not implemented in Phase 82.</p>
	</div>
</CaseWorkspaceContentRegion>
