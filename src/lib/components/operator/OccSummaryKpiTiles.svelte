<script lang="ts">
	/**
	 * P75-07 — OCC summary band: four KPI slots from OPERATOR_COMMAND_CENTER_SPEC §Default layout.
	 * P77-02 — Visual system: token KPI hierarchy (no new metrics).
	 * P131.7-04 — Thin translucent tiles; icon | metric stack | action (presentation only).
	 * P131.8-01 — KPI density/strip height tuned in `detectiveSurfaces.css` (`.ds-occ-kpi-card*`); markup unchanged.
	 * P131.9-07 — Further strip compression in CSS only (thin status row; same slots/labels/metrics).
	 */
	import { getContext } from 'svelte';

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
		<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
			/>
		</svg>
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
		<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
			/>
		</svg>
	</div>
</div>

<!-- Pending reviews — AMBER -->
<div class="ds-occ-kpi-card ds-occ-kpi-card--amber" data-occ-slot="reviews" data-testid="occ-summary-reviews">
	<div class="ds-occ-kpi-card__icon-tile" aria-hidden="true">
		<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.845 4.01 9 4.973 9 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H9.75ZM9.75 15.75h.008v.008H9.75v-.008Zm0 3h.008v.008H9.75v-.008Zm0 3h.008v.008H9.75v-.008Z"
			/>
		</svg>
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
		<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
			/>
		</svg>
	</div>
</div>

<!-- Workflow tasks due — GREEN -->
<div class="ds-occ-kpi-card ds-occ-kpi-card--green" data-occ-slot="tasks" data-testid="occ-summary-tasks">
	<div class="ds-occ-kpi-card__icon-tile" aria-hidden="true">
		<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
			/>
		</svg>
	</div>
	<div class="ds-occ-kpi-card__body">
		<div class="ds-occ-kpi-card__label">{$i18n.t('Workflow tasks due')}</div>
		<p class="ds-occ-kpi-card__metric ds-occ-kpi-card__metric--muted">{dash()}</p>
		<p class="ds-occ-kpi-card__support">{$i18n.t('No operator task queue API is wired in this build.')}</p>
	</div>
	<div class="ds-occ-kpi-card__action-tile" aria-hidden="true">
		<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
			/>
		</svg>
	</div>
</div>

<!-- Alerts / matches — RED -->
<div class="ds-occ-kpi-card ds-occ-kpi-card--red" data-occ-slot="alerts" data-testid="occ-summary-alerts">
	<div class="ds-occ-kpi-card__icon-tile" aria-hidden="true">
		<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75v-.7V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
			/>
		</svg>
	</div>
	<div class="ds-occ-kpi-card__body">
		<div class="ds-occ-kpi-card__label">{$i18n.t('Alerts / matches')}</div>
		<p class="ds-occ-kpi-card__metric ds-occ-kpi-card__metric--muted">{dash()}</p>
		<p class="ds-occ-kpi-card__support">
			{$i18n.t('No intelligence or alert feed endpoint is available at the workspace level in this build.')}
		</p>
	</div>
	<div class="ds-occ-kpi-card__action-tile" aria-hidden="true">
		<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M9 12.75 11.25 15 15.75 18.75a3.375 3.375 0 1 1-3.375-3.375c1.017 0 1.935.45 2.55 1.164l.75.75a3.375 3.375 0 1 0 4.773-4.773l-1.836-1.835M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
			/>
		</svg>
	</div>
</div>
