<script lang="ts">
	/**
	 * P98-03 / P98-05 — File-origin declared links: **no** P98-01 builder yet — this block stays empty
	 * (no speculative chrome, no fake rows). When a read contract exists, populate using the same
	 * `P98_DECLARED_RELATIONSHIP_REGION_ARIA` + list pattern as Timeline/Tasks.
	 */
	import { P98_DECLARED_RELATIONSHIP_REGION_ARIA } from '$lib/case/p98DeclaredRelationshipPresentation';
	import { caseFileDeclaredRelationshipsPresentation } from '$lib/case/filesP98DeclaredRelationships';

	export let caseId: string;
	export let fileId: string;

	$: p = caseFileDeclaredRelationshipsPresentation(caseId, fileId);
</script>

{#if p.show}
	<div
		class="mt-2 pt-2 border-t border-gray-100/90 dark:border-gray-800/80"
		data-testid="case-files-p98-declared-relationships"
		aria-label={P98_DECLARED_RELATIONSHIP_REGION_ARIA}
	></div>
{/if}
