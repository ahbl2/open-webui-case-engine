<script lang="ts">
	import Spinner from '$lib/components/common/Spinner.svelte';

	/** Optional label rendered below the spinner. */
	export let label = '';

	/** Optional data-testid forwarded to the root element. */
	export let testId = '';
</script>

<!-- P74-06: DS loading primitive (`ds-loading`, `ds-loading-icon`). -->
<div class="ds-loading" data-testid={testId || undefined}>
	<Spinner className="size-5 ds-loading-icon" />
	{#if label}
		<p class="ds-loading-label">{label}</p>
	{/if}
</div>
