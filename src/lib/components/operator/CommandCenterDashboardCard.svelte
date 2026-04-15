<!--
	P131.5-01 — Presentational dashboard card chrome for Command Center grid only.
	P131.5-05 — Variants, metric title tone, optional header icons (no data / stores / API).
-->
<script lang="ts">
	import CommandCenterDashboardIcon from '$lib/components/operator/CommandCenterDashboardIcon.svelte';
	import { DS_TYPE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';

	/** Optional chrome title (summary placeholders). Omit when wrapping sections that include their own headings. */
	export let title = '';
	/** Optional one-line factual subheader under the title (P131.5-03+). */
	export let subtitle = '';
	export let testId = 'command-center-dashboard-card';
	/** Tailwind grid utilities applied to the card root (e.g. `lg:col-span-8`). */
	export let gridClass = '';
	/** Empty dashed body for P131.5-02; no slot content. */
	export let summaryPlaceholder = false;
	/** P131.5-05 — Surface hierarchy: primary = Case List; secondary = Activity / Workflow; default = summary metrics. */
	export let variant: 'default' | 'primary' | 'secondary' = 'default';
	/** P131.5-05 — Metric cards use a smaller, muted title in the header. */
	export let titleTone: 'default' | 'metric' = 'default';
	/** P131.5-05 — Decorative icon next to title (scanning only). */
	export let headerIcon: 'folder' | 'clock' | 'list' | 'circle' | null = null;

	$: rootClass =
		variant === 'primary'
			? 'rounded-xl border border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-raised)] shadow-md ring-1 ring-slate-500/10 dark:ring-slate-400/[0.07]'
			: variant === 'secondary'
				? 'rounded-xl border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-muted)] shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.04]'
				: 'rounded-xl border border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-muted)] shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.05]';

	$: titleClass =
		titleTone === 'metric'
			? `${DS_TYPE_CLASSES.meta} m-0 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[color:var(--ce-l-text-muted)]`
			: `${DS_TYPE_CLASSES.panel} m-0 text-base font-semibold tracking-tight text-[color:var(--ce-l-text-primary)]`;
</script>

<div
	class="flex min-h-0 flex-col overflow-hidden {rootClass} {gridClass}"
	data-testid={testId}
	data-p131-5-dashboard-card="true"
	data-p131-5-dashboard-card-variant={variant}
	data-p131-5-summary-placeholder={summaryPlaceholder ? 'true' : undefined}
>
	{#if title}
		<header
			class="shrink-0 border-b border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-chrome)] px-4 py-3.5 sm:px-5"
			data-testid="{testId}-title"
		>
			<div class="flex items-start gap-3">
				{#if headerIcon}
					<span
						class="mt-0.5 shrink-0 text-[color:var(--ce-l-text-muted)]"
						aria-hidden="true"
						data-testid="{testId}-header-icon"
					>
						<CommandCenterDashboardIcon
							name={headerIcon}
							className={titleTone === 'metric' ? 'h-4 w-4' : 'h-5 w-5'}
						/>
					</span>
				{/if}
				<div class="min-w-0 flex-1">
					<h2 class={titleClass}>
						{title}
					</h2>
					{#if subtitle}
						<p
							class="{DS_TYPE_CLASSES.meta} m-0 mt-2 max-w-[80ch] text-xs leading-relaxed text-[color:var(--ce-l-text-muted)]"
							data-testid="{testId}-subtitle"
						>
							{subtitle}
						</p>
					{/if}
				</div>
			</div>
		</header>
	{/if}
	<div class="min-h-0 flex-1 overflow-auto {summaryPlaceholder ? 'p-4' : 'p-0'}">
		{#if summaryPlaceholder}
			<div
				class="min-h-[4rem] rounded-lg border border-dashed border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-raised)]/50"
				aria-hidden="true"
				data-testid="{testId}-empty"
			></div>
		{:else}
			<slot />
		{/if}
	</div>
</div>
