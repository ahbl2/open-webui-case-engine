<script lang="ts">
	/**
	 * Recent / scoped cases list (shared by HomeDesktopPanels and OCC main column).
	 */
	import { goto } from '$app/navigation';

	import { caseEngineToken } from '$lib/stores';
	import type { CaseEngineCase } from '$lib/apis/caseEngine';

	export let casesLoading: boolean;
	export let casesError: string;
	export let loadCases: () => void;
	export let recentCases: CaseEngineCase[];
	export let goToCases: () => void;
	export let statusColor: (status: string) => string;
</script>

<div class="flex items-center justify-between mb-3">
	<div class="flex items-center gap-2">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			stroke-width="1.5"
			stroke="currentColor"
			class="size-4 text-gray-500 dark:text-gray-400"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
			/>
		</svg>
		<h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Your Cases</h2>
	</div>
	<button
		type="button"
		class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
		on:click={goToCases}
	>
		View all →
	</button>
</div>

{#if !$caseEngineToken}
	<p class="text-sm text-gray-400 dark:text-gray-500 italic py-2">Case Engine session not active.</p>
{:else if casesLoading}
	<p class="text-sm text-gray-400 dark:text-gray-500 italic py-2">Loading cases…</p>
{:else if casesError}
	<div class="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-3">
		<p class="text-xs text-red-700 dark:text-red-400">{casesError}</p>
		<button class="mt-1 text-xs text-red-600 dark:text-red-400 underline" on:click={loadCases}>
			Try again
		</button>
	</div>
{:else if recentCases.length === 0}
	<div
		class="rounded-xl border border-dashed border-gray-200 dark:border-gray-700
		       bg-gray-50 dark:bg-gray-900 p-5 text-center"
	>
		<p class="text-sm text-gray-400 dark:text-gray-500">No cases available under your current scope.</p>
		<button
			type="button"
			class="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
			on:click={goToCases}
		>
			Go to Cases →
		</button>
	</div>
{:else}
	<div class="flex flex-col gap-1.5" data-testid="recent-cases-list">
		{#each recentCases as c (c.id)}
			<button
				type="button"
				class="w-full text-left flex items-center gap-3 rounded-lg border border-gray-200
				       dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50
				       dark:hover:bg-gray-750 px-3 py-2.5 transition"
				on:click={() => goto(`/case/${c.id}/chat`)}
				data-testid="recent-case-item"
				data-case-id={c.id}
			>
				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-2 mb-0.5">
						<span class="text-xs font-mono text-gray-500 dark:text-gray-400 shrink-0">
							#{c.case_number}
						</span>
						<span class="text-[10px] px-1 py-0.5 rounded font-medium shrink-0 {statusColor(c.status)}">
							{c.status}
						</span>
						<span class="text-[10px] text-gray-400 dark:text-gray-600 shrink-0">{c.unit}</span>
					</div>
					<p class="text-sm text-gray-800 dark:text-gray-100 truncate">{c.title}</p>
				</div>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="size-4 text-gray-400 shrink-0"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
				</svg>
			</button>
		{/each}
	</div>
{/if}
