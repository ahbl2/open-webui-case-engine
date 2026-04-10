<script lang="ts">
	/**
	 * P75-07 — OCC summary band: four KPI slots from OPERATOR_COMMAND_CENTER_SPEC §Default layout.
	 * Real metrics from listCases + personal threads; no fabricated workspace-wide proposal counts.
	 */
	import { getContext } from 'svelte';

	import {
		DS_TYPE_CLASSES,
		DS_PANEL_CLASSES,
		DS_EMPTY_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';

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
	class="ds-occ-summary-slot {DS_PANEL_CLASSES.muted} ds-panel-dense"
	data-occ-slot="assigned"
	data-testid="occ-summary-assigned"
>
	<div
		class="{DS_TYPE_CLASSES.meta} font-semibold uppercase tracking-wide text-[color:var(--ds-text-muted)]"
	>
		{$i18n.t('Active / open cases')}
	</div>
	{#if !hasToken}
		<p class="text-2xl font-semibold tabular-nums text-[color:var(--ds-text-muted)] mt-0.5">
			{dash()}
		</p>
		<p class="{DS_EMPTY_CLASSES.description} leading-snug">
			{$i18n.t('Connect Case Engine to load case metrics.')}
		</p>
	{:else if casesLoading}
		<p class="text-sm text-[color:var(--ds-text-muted)] mt-1 italic">{$i18n.t('Loading…')}</p>
	{:else if casesError}
		<p class="text-2xl font-semibold tabular-nums text-[color:var(--ds-text-muted)] mt-0.5">
			{dash()}
		</p>
		<p class="{DS_EMPTY_CLASSES.description} leading-snug">{casesError}</p>
	{:else}
		<p class="text-2xl font-semibold tabular-nums text-[color:var(--ds-text-primary)] mt-0.5">
			{activeOpenCount}
		</p>
		<p class="{DS_EMPTY_CLASSES.description} leading-snug">
			{$i18n.t('In scope:')} {totalCasesInScope}
			{#if !threadsLoading}
				· {$i18n.t('Personal threads:')} {threadCount}
			{/if}
		</p>
	{/if}
</div>

<div
	class="ds-occ-summary-slot {DS_PANEL_CLASSES.muted} ds-panel-dense"
	data-occ-slot="reviews"
	data-testid="occ-summary-reviews"
>
	<div
		class="{DS_TYPE_CLASSES.meta} font-semibold uppercase tracking-wide text-[color:var(--ds-text-muted)]"
	>
		{$i18n.t('Pending reviews')}
	</div>
	<p class="text-2xl font-semibold tabular-nums text-[color:var(--ds-text-muted)] mt-0.5">{dash()}</p>
	<p class="{DS_EMPTY_CLASSES.description} leading-snug">
		{$i18n.t(
			'Proposals are reviewed per case. There is no workspace-wide pending count in this build — open a case to review its Proposals tab.'
		)}
	</p>
</div>

<div
	class="ds-occ-summary-slot {DS_PANEL_CLASSES.muted} ds-panel-dense"
	data-occ-slot="tasks"
	data-testid="occ-summary-tasks"
>
	<div
		class="{DS_TYPE_CLASSES.meta} font-semibold uppercase tracking-wide text-[color:var(--ds-text-muted)]"
	>
		{$i18n.t('Workflow tasks due')}
	</div>
	<p class="text-2xl font-semibold tabular-nums text-[color:var(--ds-text-muted)] mt-0.5">{dash()}</p>
	<p class="{DS_EMPTY_CLASSES.description} leading-snug">
		{$i18n.t('No operator task queue API is wired in this build.')}
	</p>
</div>

<div
	class="ds-occ-summary-slot {DS_PANEL_CLASSES.muted} ds-panel-dense"
	data-occ-slot="alerts"
	data-testid="occ-summary-alerts"
>
	<div
		class="{DS_TYPE_CLASSES.meta} font-semibold uppercase tracking-wide text-[color:var(--ds-text-muted)]"
	>
		{$i18n.t('Alerts / matches')}
	</div>
	<p class="text-2xl font-semibold tabular-nums text-[color:var(--ds-text-muted)] mt-0.5">{dash()}</p>
	<p class="{DS_EMPTY_CLASSES.description} leading-snug">
		{$i18n.t('No intelligence or alert feed endpoint is available at the workspace level in this build.')}
	</p>
</div>
