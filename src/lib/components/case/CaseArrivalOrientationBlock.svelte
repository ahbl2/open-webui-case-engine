<script lang="ts">
	/**
	 * P99-02 / P99-03 — Read-only arrival/orientation strip (contract-driven only).
	 *
	 * - **No** expansion, scrolling, or rich formatting inside `source_echo`.
	 * - **P99-03:** optional **Return** control only when `context.is_returnable` — deterministic
	 *   {@link navigateArrivalReturnToSource} (explicit `goto` only; no storage).
	 * - Renders **nothing** when `context` is null/undefined.
	 */
	import { goto } from '$app/navigation';
	import type { ArrivalContext } from '$lib/case/p99ArrivalContextReadModel';
	import {
		arrivalReturnAriaLabel,
		navigateArrivalReturnToSource,
		P99_RETURN_ACTION_LABEL
	} from '$lib/case/p99ArrivalReturnNavigation';

	export let context: ArrivalContext | null | undefined = null;
	/** Optional test id prefix — outputs `data-testid="{testId}"` when set. */
	export let testId = 'case-p99-arrival-orientation';

	async function onReturn(): Promise<void> {
		if (!context?.is_returnable) return;
		await navigateArrivalReturnToSource(context, goto);
	}
</script>

{#if context}
	<div
		class="ds-p99-arrival shrink-0 border-b border-gray-100/90 dark:border-gray-800/80 bg-gray-50/80 dark:bg-gray-900/40 px-4 py-2"
		data-testid={testId}
		role="status"
		aria-label="Arrival orientation"
	>
		<p class="m-0 text-xs font-medium text-gray-700 dark:text-gray-200" data-testid="{testId}-heading">
			{context.heading}
		</p>
		<p class="m-0 mt-0.5 text-[11px] text-gray-600 dark:text-gray-400 font-mono leading-snug" data-testid="{testId}-subline">
			{context.subline}
		</p>
		{#if context.source_echo && context.source_echo.length > 0}
			<div class="mt-1.5 space-y-0.5" data-testid="{testId}-echo">
				{#each context.source_echo as line, i (i)}
					<p class="m-0 text-[10px] text-gray-500 dark:text-gray-500 font-mono leading-snug max-h-[2.5rem] overflow-hidden">
						{line}
					</p>
				{/each}
			</div>
		{/if}
		{#if context.is_returnable}
			<div
				class="mt-1.5 pt-1.5 border-t border-dashed border-gray-200/80 dark:border-gray-700/60"
				data-testid="{testId}-return-region"
			>
				<button
					type="button"
					class="ds-p99-arrival-return m-0 p-0 bg-transparent border-0 cursor-pointer text-left text-[10px] font-mono text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 underline decoration-gray-400/70 underline-offset-2"
					data-testid="{testId}-return"
					aria-label={arrivalReturnAriaLabel(context)}
					on:click={() => void onReturn()}
				>
					{P99_RETURN_ACTION_LABEL}
				</button>
			</div>
		{/if}
	</div>
{/if}
