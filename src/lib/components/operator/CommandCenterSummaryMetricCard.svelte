<!--
	P131.5-02 — Read-only summary metric chrome for Command Center dashboard row (presentation only).
	P131.5-05 — Metric title tone, larger values, optional icons.
-->
<script lang="ts">
	import CommandCenterDashboardCard from '$lib/components/operator/CommandCenterDashboardCard.svelte';
	import { DS_TYPE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';

	export let title: string;
	export let subtitle: string;
	export let testId: string;
	export let gridClass = 'lg:col-span-3';
	/** P131.5-05 — Decorative icon (neutral stroke only). */
	export let headerIcon: 'folder' | 'clock' | 'list' | 'circle';
	/** When false, value shows as em dash and subtitle may reflect no-session copy from parent. */
	export let hasToken: boolean;
	export let loading = false;
	export let loadError: string | null = null;
	/** Shown when hasToken && !loading && !loadError */
	export let value: number;
</script>

<CommandCenterDashboardCard
	{title}
	{testId}
	{gridClass}
	titleTone="metric"
	headerIcon={headerIcon}
>
	<div
		class="flex min-h-[5rem] flex-col justify-center gap-2 px-4 py-4 sm:px-5 sm:py-5"
		data-testid="{testId}-body"
	>
		{#if !hasToken}
			<p
				class="m-0 text-3xl font-bold tabular-nums leading-none tracking-tight text-[color:var(--ce-l-text-muted)]"
				data-testid="{testId}-value"
			>
				—
			</p>
			<p class="{DS_TYPE_CLASSES.meta} m-0 leading-snug text-[color:var(--ce-l-text-muted)]" data-testid="{testId}-subtitle">
				{subtitle}
			</p>
		{:else if loading}
			<p
				class="{DS_TYPE_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-muted)]"
				data-testid="{testId}-loading"
			>
				Loading…
			</p>
		{:else if loadError}
			<p
				class="{DS_TYPE_CLASSES.body} m-0 text-sm text-red-800 dark:text-red-200"
				role="alert"
				data-testid="{testId}-error"
			>
				{loadError}
			</p>
		{:else}
			<p
				class="m-0 text-[1.85rem] font-bold tabular-nums leading-none tracking-tight text-[color:var(--ce-l-text-primary)] sm:text-[2rem]"
				data-testid="{testId}-value"
			>
				{value}
			</p>
			<p
				class="{DS_TYPE_CLASSES.meta} m-0 max-w-[28ch] leading-relaxed text-[color:var(--ce-l-text-muted)]"
				data-testid="{testId}-subtitle"
			>
				{subtitle}
			</p>
		{/if}
	</div>
</CommandCenterDashboardCard>
