<script lang="ts">
	import Spinner from '$lib/components/common/Spinner.svelte';

	/** Optional label rendered below the spinner. */
	export let label = '';

	/** Optional data-testid forwarded to the root element. */
	export let testId = '';
</script>

<div
	class="flex flex-col items-center justify-center gap-2 py-10"
	data-testid={testId || undefined}
>
	<Spinner className="size-5 text-[color:var(--ce-l-loading-fg)]" />
	{#if label}
		<p class="text-sm text-[color:var(--ce-l-text-muted)]">{label}</p>
	{/if}
</div>
