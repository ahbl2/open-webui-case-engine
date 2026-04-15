<script lang="ts">
	/**
	 * P131.6-02 — Explicit loading / empty / data states for Home dashboard zones.
	 * P131.6-03 — Error precedence; standardized copy (no raw backend messages in UI).
	 * P131.6-04 — ARIA: alert (error), status (loading/empty), aria-busy when loading.
	 */
	import OccErrorBlock from '$lib/components/operator/OccErrorBlock.svelte';

	/** When true, show loading slot (or default skeleton if parent supplies none). */
	export let isLoading = false;
	/** When true (and not loading/error), show empty slot. */
	export let isEmpty = false;
	export let emptyTitle = '';
	/** Secondary line; omit or pass empty string to hide. */
	export let emptySubtext = 'Items will appear here when available.';
	/**
	 * Error is active (truthy string kept for compatibility — **never** rendered to users).
	 * Prefer `hasError` for clarity.
	 */
	export let errorMessage: string | null = null;
	export let hasError = false;
	export let onRetry: (() => void) | undefined = undefined;
	/** Disables retry while a retry request is in-flight. */
	export let retryDisabled = false;
	/** Context for Retry button when multiple exist on the page (screen readers). */
	export let retryAriaLabel = '';
	/** Prevent zero-height collapse during transitions. */
	export let regionMinClass = 'min-h-[7.5rem]';

	$: errorActive = hasError || Boolean(errorMessage && String(errorMessage).trim() !== '');
	$: retryInactive = retryDisabled || isLoading;
	$: roleValue = errorActive ? 'alert' : isLoading || isEmpty ? 'status' : undefined;
	$: ariaLiveValue = errorActive ? undefined : isLoading || isEmpty ? 'polite' : undefined;
	$: ariaBusyValue = isLoading ? true : undefined;
</script>

<div
	class="ds-occ-state-container {regionMinClass} w-full min-w-0"
	data-testid="occ-state-container"
	data-occ-state-loading={isLoading ? 'true' : 'false'}
	data-occ-state-empty={isEmpty ? 'true' : 'false'}
	data-occ-state-error={errorActive ? 'true' : 'false'}
	role={roleValue}
	aria-live={ariaLiveValue}
	aria-busy={ariaBusyValue}
>
	{#if errorActive}
		<slot name="error">
			<OccErrorBlock {onRetry} retryDisabled={retryInactive} {retryAriaLabel} />
		</slot>
	{:else if isLoading}
		<slot name="loading" />
	{:else if isEmpty}
		<slot name="empty">
			<div class="ds-empty-framed ds-empty-compact w-full">
				<p class="ds-empty-title">{emptyTitle}</p>
				{#if emptySubtext && emptySubtext.trim() !== ''}
					<p class="ds-empty-description max-w-none">{emptySubtext}</p>
				{/if}
			</div>
		</slot>
	{:else}
		<slot />
	{/if}
</div>
