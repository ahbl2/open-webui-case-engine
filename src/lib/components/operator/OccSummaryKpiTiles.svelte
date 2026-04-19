<script lang="ts">
	/**
	 * P75-07 — OCC summary band: four KPI slots from OPERATOR_COMMAND_CENTER_SPEC §Default layout.
	 * P77-02 — Visual system: token KPI hierarchy (no new metrics).
	 * P131.7-04 — Thin translucent tiles; icon | metric stack | action (presentation only).
	 * OCC icon set — `src/lib/components/icons/occ/*` (mockup parity: dual tiles + trend).
	 */
	import { getContext } from 'svelte';
	import OccIconKpiPeopleThree from '$lib/components/icons/occ/OccIconKpiPeopleThree.svelte';
	import OccIconFolder from '$lib/components/icons/occ/OccIconFolder.svelte';
	import OccIconKpiDocumentMagnify from '$lib/components/icons/occ/OccIconKpiDocumentMagnify.svelte';
	import OccIconKpiNotebookPencil from '$lib/components/icons/occ/OccIconKpiNotebookPencil.svelte';
	import OccIconKpiCalendarDateRange from '$lib/components/icons/occ/OccIconKpiCalendarDateRange.svelte';
	import OccIconKpiExternalLink from '$lib/components/icons/occ/OccIconKpiExternalLink.svelte';
	import OccIconKpiBellSquare from '$lib/components/icons/occ/OccIconKpiBellSquare.svelte';
	import OccIconKpiShield from '$lib/components/icons/occ/OccIconKpiShield.svelte';
	import OccIconTrendUp from '$lib/components/icons/occ/OccIconTrendUp.svelte';

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

<!-- Grid: OperatorCommandCenterFrame `ds-occ-summary-band` -->

<!-- Active / open cases — BLUE -->
<div
	class="ds-occ-kpi-card ds-occ-kpi-card--blue"
	data-occ-slot="assigned"
	data-testid="occ-summary-assigned"
>
	<div class="ds-occ-kpi-card__icon-tile" aria-hidden="true">
		<OccIconKpiPeopleThree />
	</div>
	<div class="ds-occ-kpi-card__body">
		<div class="ds-occ-kpi-card__label">{$i18n.t('Active / open cases')}</div>
		{#if !hasToken}
			<p class="ds-occ-kpi-card__metric ds-occ-kpi-card__metric--muted">{dash()}</p>
			<p class="ds-occ-kpi-card__support">{$i18n.t('Connect Case Engine to load case metrics.')}</p>
		{:else if casesLoading}
			<p class="ds-occ-kpi-card__metric ds-occ-kpi-card__metric--muted">{dash()}</p>
			<p class="ds-occ-kpi-card__support ds-occ-kpi-card__support--loading">{$i18n.t('Loading…')}</p>
		{:else if casesError}
			<p class="ds-occ-kpi-card__metric ds-occ-kpi-card__metric--muted">{dash()}</p>
			<p class="ds-occ-kpi-card__support ds-occ-kpi-card__support--error">{casesError}</p>
		{:else}
			<p class="ds-occ-kpi-card__metric">{activeOpenCount}</p>
			<p class="ds-occ-kpi-card__support">
				{$i18n.t('In scope:')}
				{totalCasesInScope}
			</p>
			{#if !threadsLoading}
				<p class="ds-occ-kpi-card__status">
					{$i18n.t('Personal threads:')}
					{threadCount}
				</p>
			{/if}
		{/if}
	</div>
	<div class="ds-occ-kpi-card__action-tile" aria-hidden="true">
		<OccIconFolder variant="kpi" />
	</div>
	<div class="ds-occ-kpi-card__trend ds-occ-kpi-card__trend--positive" aria-hidden="true">
		<OccIconTrendUp />
	</div>
</div>

<!-- Pending reviews — AMBER -->
<div class="ds-occ-kpi-card ds-occ-kpi-card--amber" data-occ-slot="reviews" data-testid="occ-summary-reviews">
	<div class="ds-occ-kpi-card__icon-tile" aria-hidden="true">
		<OccIconKpiDocumentMagnify />
	</div>
	<div class="ds-occ-kpi-card__body">
		<div class="ds-occ-kpi-card__label">{$i18n.t('Pending reviews')}</div>
		<p class="ds-occ-kpi-card__metric ds-occ-kpi-card__metric--muted">{dash()}</p>
		<p class="ds-occ-kpi-card__support">
			{$i18n.t(
				'Proposals are reviewed per case. There is no workspace-wide pending count in this build — open a case to review its Proposals tab.'
			)}
		</p>
	</div>
	<div class="ds-occ-kpi-card__action-tile" aria-hidden="true">
		<OccIconKpiNotebookPencil />
	</div>
	<div class="ds-occ-kpi-card__trend ds-occ-kpi-card__trend--positive" aria-hidden="true">
		<OccIconTrendUp />
	</div>
</div>

<!-- Workflow tasks due — GREEN -->
<div class="ds-occ-kpi-card ds-occ-kpi-card--green" data-occ-slot="tasks" data-testid="occ-summary-tasks">
	<div class="ds-occ-kpi-card__icon-tile" aria-hidden="true">
		<OccIconKpiCalendarDateRange />
	</div>
	<div class="ds-occ-kpi-card__body">
		<div class="ds-occ-kpi-card__label">{$i18n.t('Workflow tasks due')}</div>
		<p class="ds-occ-kpi-card__metric ds-occ-kpi-card__metric--muted">{dash()}</p>
		<p class="ds-occ-kpi-card__support">{$i18n.t('No operator task queue API is wired in this build.')}</p>
	</div>
	<div class="ds-occ-kpi-card__action-tile" aria-hidden="true">
		<OccIconKpiExternalLink />
	</div>
	<div class="ds-occ-kpi-card__trend ds-occ-kpi-card__trend--positive" aria-hidden="true">
		<OccIconTrendUp />
	</div>
</div>

<!-- Alerts / matches — RED -->
<div class="ds-occ-kpi-card ds-occ-kpi-card--red" data-occ-slot="alerts" data-testid="occ-summary-alerts">
	<div class="ds-occ-kpi-card__icon-tile" aria-hidden="true">
		<OccIconKpiBellSquare />
	</div>
	<div class="ds-occ-kpi-card__body">
		<div class="ds-occ-kpi-card__label">{$i18n.t('Alerts / matches')}</div>
		<p class="ds-occ-kpi-card__metric ds-occ-kpi-card__metric--muted">{dash()}</p>
		<p class="ds-occ-kpi-card__support">
			{$i18n.t('No intelligence or alert feed endpoint is available at the workspace level in this build.')}
		</p>
	</div>
	<div class="ds-occ-kpi-card__action-tile" aria-hidden="true">
		<OccIconKpiShield />
	</div>
	<div class="ds-occ-kpi-card__trend ds-occ-kpi-card__trend--warning" aria-hidden="true">
		<OccIconTrendUp />
	</div>
</div>
