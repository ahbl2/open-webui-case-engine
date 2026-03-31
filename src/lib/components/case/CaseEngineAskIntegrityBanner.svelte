<script lang="ts">
	import {
		askIntegrityPresentationMeta,
		type AskIntegrityPresentation
	} from '$lib/utils/askIntegrityUi';

	export let integrityPresentation: AskIntegrityPresentation | undefined = undefined;

	$: meta = askIntegrityPresentationMeta(integrityPresentation);
</script>

{#if meta}
	<div
		class="rounded-md border px-3 py-2 text-xs leading-snug {meta.panelClass}"
		data-ask-integrity-presentation={integrityPresentation ?? ''}
		role="status"
	>
		<div class="font-semibold tracking-tight">{meta.badgeLabel}</div>
		<p class="mt-1 opacity-90">{meta.hint}</p>
	</div>
{/if}
