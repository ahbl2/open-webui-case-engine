<script lang="ts">
	/**
	 * P75-07 — OCC summary band: four KPI slots from OPERATOR_COMMAND_CENTER_SPEC §Default layout.
	 * P77-02 — Visual system: token KPI hierarchy (no new metrics).
	 */
	import { getContext } from 'svelte';

	import { DS_OCC_CLASSES } from '$lib/case/detectivePrimitiveFoundation';

	const i18n = getContext('i18n');

	export let hasToken: boolean;
	export let casesLoading: boolean;
	export let casesError: string;
	/** Total cases returned for current unit scope (listCases). */
	export let totalCasesInScope: number;
	export let activeOpenCount: number;
	export let threadsLoading: boolean;
	export let threadCount: number;

	function dash(): string {
		return '—';
	}
</script>

<!-- Grid lives inside OperatorCommandCenterFrame `ds-occ-summary-band` as four `ds-occ-summary-slot` tiles. -->

<div
	class={DS_OCC_CLASSES.summarySlot}
	data-occ-slot="assigned"
	data-testid="occ-summary-assigned"
>
	<div class={DS_OCC_CLASSES.summaryLabel}>
		{$i18n.t('Active / open cases')}
	</div>
	{#if !hasToken}
		<p class="{DS_OCC_CLASSES.summaryValue} {DS_OCC_CLASSES.summaryValueMuted}">
			{dash()}
		</p>
		<p class={DS_OCC_CLASSES.summaryHint}>
			{$i18n.t('Connect Case Engine to load case metrics.')}
		</p>
	{:else if casesLoading}
		<p class="{DS_OCC_CLASSES.summaryHint} {DS_OCC_CLASSES.summaryHintLoading}">{$i18n.t('Loading…')}</p>
	{:else if casesError}
		<p class="{DS_OCC_CLASSES.summaryValue} {DS_OCC_CLASSES.summaryValueMuted}">
			{dash()}
		</p>
		<p class={DS_OCC_CLASSES.summaryHint}>{casesError}</p>
	{:else}
		<p class={DS_OCC_CLASSES.summaryValue}>{activeOpenCount}</p>
		<p class={DS_OCC_CLASSES.summaryHint}>
			{$i18n.t('In scope:')} {totalCasesInScope}
			{#if !threadsLoading}
				· {$i18n.t('Personal threads:')} {threadCount}
			{/if}
		</p>
	{/if}
</div>

<div class={DS_OCC_CLASSES.summarySlot} data-occ-slot="reviews" data-testid="occ-summary-reviews">
	<div class={DS_OCC_CLASSES.summaryLabel}>
		{$i18n.t('Pending reviews')}
	</div>
	<p class="{DS_OCC_CLASSES.summaryValue} {DS_OCC_CLASSES.summaryValueMuted}">{dash()}</p>
	<p class={DS_OCC_CLASSES.summaryHint}>
		{$i18n.t(
			'Proposals are reviewed per case. There is no workspace-wide pending count in this build — open a case to review its Proposals tab.'
		)}
	</p>
</div>

<div class={DS_OCC_CLASSES.summarySlot} data-occ-slot="tasks" data-testid="occ-summary-tasks">
	<div class={DS_OCC_CLASSES.summaryLabel}>
		{$i18n.t('Workflow tasks due')}
	</div>
	<p class="{DS_OCC_CLASSES.summaryValue} {DS_OCC_CLASSES.summaryValueMuted}">{dash()}</p>
	<p class={DS_OCC_CLASSES.summaryHint}>
		{$i18n.t('No operator task queue API is wired in this build.')}
	</p>
</div>

<div class={DS_OCC_CLASSES.summarySlot} data-occ-slot="alerts" data-testid="occ-summary-alerts">
	<div class={DS_OCC_CLASSES.summaryLabel}>
		{$i18n.t('Alerts / matches')}
	</div>
	<p class="{DS_OCC_CLASSES.summaryValue} {DS_OCC_CLASSES.summaryValueMuted}">{dash()}</p>
	<p class={DS_OCC_CLASSES.summaryHint}>
		{$i18n.t('No intelligence or alert feed endpoint is available at the workspace level in this build.')}
	</p>
</div>
