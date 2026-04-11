<script lang="ts">
	/**
	 * Recent / scoped cases list (shared by HomeDesktopPanels and OCC main column).
	 * P77-02 — DS resource rows + semantic status badges.
	 */
	import { goto } from '$app/navigation';

	import { caseEngineToken } from '$lib/stores';
	import type { CaseEngineCase } from '$lib/apis/caseEngine';
	import {
		DS_BTN_CLASSES,
		DS_OCC_CLASSES,
		DS_STATUS_SURFACE_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';

	export let casesLoading: boolean;
	export let casesError: string;
	export let loadCases: () => void;
	export let recentCases: CaseEngineCase[];
	export let goToCases: () => void;
	export let statusBadgeClass: (status: string) => string;
</script>

<div class={DS_OCC_CLASSES.sectionHeaderRow}>
	<div class={DS_OCC_CLASSES.sectionHeaderTitle}>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			stroke-width="1.5"
			stroke="currentColor"
			class="size-4 shrink-0 text-[color:var(--ds-text-muted)]"
			aria-hidden="true"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
			/>
		</svg>
		<h2 class={DS_OCC_CLASSES.sectionHeaderHeading}>Your Cases</h2>
	</div>
	<button type="button" class="{DS_BTN_CLASSES.ghost} text-sm shrink-0" on:click={goToCases}>
		View all →
	</button>
</div>

{#if !$caseEngineToken}
	<p class="{DS_TYPE_CLASSES.meta} italic py-2">Case Engine session not active.</p>
{:else if casesLoading}
	<p class="{DS_TYPE_CLASSES.meta} italic py-2">Loading cases…</p>
{:else if casesError}
	<div class="{DS_STATUS_SURFACE_CLASSES.danger} rounded-[var(--ds-radius-md)] p-3">
		<p class="{DS_TYPE_CLASSES.body}">{casesError}</p>
		<button type="button" class="{DS_BTN_CLASSES.secondary} mt-2 text-sm" on:click={loadCases}>
			Try again
		</button>
	</div>
{:else if recentCases.length === 0}
	<div
		class="{DS_STATUS_SURFACE_CLASSES.neutral} rounded-[var(--ds-radius-md)] p-5 text-center"
	>
		<p class="{DS_TYPE_CLASSES.body}">No cases available under your current scope.</p>
		<button type="button" class="{DS_BTN_CLASSES.ghost} mt-3 text-sm" on:click={goToCases}>
			Go to Cases →
		</button>
	</div>
{:else}
	<div class="flex flex-col gap-2" data-testid="recent-cases-list">
		{#each recentCases as c (c.id)}
			<button
				type="button"
				class={DS_OCC_CLASSES.resourceRow}
				on:click={() => goto(`/case/${c.id}/chat`)}
				data-testid="recent-case-item"
				data-case-id={c.id}
			>
				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-2 mb-0.5 flex-wrap">
						<span class="{DS_TYPE_CLASSES.mono} shrink-0">#{c.case_number}</span>
						<span class="{statusBadgeClass(c.status)}">{c.status}</span>
						<span class="{DS_TYPE_CLASSES.meta} shrink-0">{c.unit}</span>
					</div>
					<p class="{DS_TYPE_CLASSES.body} truncate">{c.title}</p>
				</div>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="size-4 shrink-0 opacity-50"
					aria-hidden="true"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
				</svg>
			</button>
		{/each}
	</div>
{/if}
