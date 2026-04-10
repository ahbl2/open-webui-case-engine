<script lang="ts">
	/**
	 * P33-07 / P74-09 — Case Engine Ask integrity / degraded presentation (DS `ds-ask-integrity-*`).
	 */
	import {
		askIntegrityPresentationMeta,
		type AskIntegrityPresentation
	} from '$lib/utils/askIntegrityUi';
	import { DS_ASK_INTEGRITY_CLASSES } from '$lib/case/detectivePrimitiveFoundation';

	export let integrityPresentation: AskIntegrityPresentation | undefined = undefined;

	$: meta = askIntegrityPresentationMeta(integrityPresentation);
</script>

{#if meta}
	<div
		class={meta.panelClass}
		data-ask-integrity-presentation={integrityPresentation ?? ''}
		role="status"
	>
		<div class={DS_ASK_INTEGRITY_CLASSES.title}>{meta.badgeLabel}</div>
		<p class={DS_ASK_INTEGRITY_CLASSES.hint}>{meta.hint}</p>
		{#if $$slots.detail}
			<div class={DS_ASK_INTEGRITY_CLASSES.detail}>
				<slot name="detail" />
			</div>
		{/if}
	</div>
{/if}
