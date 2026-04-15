<script lang="ts">
	/**
	 * Recent / scoped cases list (shared by HomeDesktopPanels and OCC main column).
	 * P77-02 — DS resource rows + semantic status badges.
	 * P131.6-02 — OccStateContainer for loading / empty / error (data logic unchanged).
	 * P131.7-06 — OCC board: command-center case row layout (data fields unchanged).
	 */
	import { goto } from '$app/navigation';
	import { getContext } from 'svelte';

	import { caseEngineToken } from '$lib/stores';
	import type { CaseEngineCase } from '$lib/apis/caseEngine';
	import {
		DS_BADGE_CLASSES,
		DS_BTN_CLASSES,
		DS_OCC_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import OccStateContainer from '$lib/components/operator/OccStateContainer.svelte';
	import OccSkeletonList from '$lib/components/operator/OccSkeletonList.svelte';

	export let casesLoading: boolean;
	export let casesError: string;
	export let loadCases: () => void;
	export let recentCases: CaseEngineCase[];
	export let goToCases: () => void;
	export let statusBadgeClass: (status: string) => string;
	/** P131.7-05 — OCC dashboard: header/body zones inside `mainSection` shell. Legacy home leaves false. */
	export let occBoardShell = false;

	const i18n = getContext('i18n');

	$: boardShellHeaderClass = occBoardShell ? DS_OCC_CLASSES.boardCardHeader : DS_OCC_CLASSES.boardCardPass;
	$: boardShellBodyClass = occBoardShell ? DS_OCC_CLASSES.boardCardBody : DS_OCC_CLASSES.boardCardPass;

	function readIso(c: CaseEngineCase, key: string): string | undefined {
		const v = (c as Record<string, unknown>)[key];
		return typeof v === 'string' && v.trim() ? v.trim() : undefined;
	}

	function caseLocationLine(c: CaseEngineCase): string {
		const ext = c as Record<string, unknown>;
		const loc = ext['district'] ?? ext['location_text'] ?? ext['location'];
		if (typeof loc === 'string' && loc.trim()) return loc.trim();
		return '';
	}

	function formatIncidentDate(iso: string | null | undefined): string {
		if (!iso) return '';
		const d = String(iso).slice(0, 10);
		const [y, m, day] = d.split('-');
		if (!y || !m || !day) return '';
		return `${m}/${day}/${y}`;
	}

	function formatRelativeUpdated(iso: string | undefined): string {
		if (!iso) return '';
		const ms = Date.parse(iso);
		if (Number.isNaN(ms)) return '';
		const diffMs = Date.now() - ms;
		const sec = Math.floor(diffMs / 1000);
		const min = Math.floor(sec / 60);
		const hr = Math.floor(min / 60);
		const day = Math.floor(hr / 24);
		if (day > 6) return new Date(ms).toLocaleDateString();
		if (day > 0) return `${day}d ago`;
		if (hr > 0) return `${hr}h ago`;
		if (min > 0) return `${min}m ago`;
		return 'just now';
	}

	function unitBadgeClass(unit: string): string {
		const u = String(unit).toUpperCase();
		if (u === 'SIU') return DS_BADGE_CLASSES.unitSiu;
		if (u === 'CID') return DS_BADGE_CLASSES.unitCid;
		return DS_BADGE_CLASSES.neutral;
	}

	function openCase(c: CaseEngineCase): void {
		void goto(`/case/${c.id}/chat`);
	}
</script>

<div class={boardShellHeaderClass}>
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
					d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5m-13.5 0h1.5m-1.5 0A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-1.5m-13.5 0v-8.25c0-.621.504-1.125 1.125-1.125h4.875c.621 0 1.125.504 1.125 1.125v1.875c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125.504 1.125 1.125V9.75"
				/>
			</svg>
			<h3
				id="occ-home-your-cases-heading"
				class={occBoardShell
					? `${DS_TYPE_CLASSES.meta} font-semibold uppercase tracking-wide text-[color:var(--ds-text-muted)]`
					: DS_OCC_CLASSES.sectionHeaderHeading}
			>
				{#if occBoardShell}
					{$i18n.t('Active / assigned cases')}
				{:else}
					Your Cases
				{/if}
			</h3>
		</div>
		<button type="button" class="{DS_BTN_CLASSES.ghost} text-sm shrink-0" on:click={goToCases}>
			{#if occBoardShell}
				{$i18n.t('View all cases →')}
			{:else}
				View all →
			{/if}
		</button>
	</div>
</div>

{#if !$caseEngineToken}
	<div class={boardShellBodyClass}>
		<p class="{DS_TYPE_CLASSES.meta} italic py-2">Case Engine session not active.</p>
	</div>
{:else}
	<div class={boardShellBodyClass}>
		<OccStateContainer
			hasError={Boolean(casesError)}
			onRetry={loadCases}
			retryDisabled={casesLoading}
			retryAriaLabel={$i18n.t('Retry loading cases')}
			isLoading={casesLoading}
			isEmpty={!casesLoading && !casesError && recentCases.length === 0}
			emptyTitle={$i18n.t('No cases found.')}
			emptySubtext={$i18n.t('Items will appear here when available.')}
			regionMinClass="min-h-[10rem]"
		>
			<svelte:fragment slot="loading">
				<OccSkeletonList rows={5} />
			</svelte:fragment>
			<svelte:fragment slot="empty">
				<div class="ds-empty-framed ds-empty-compact w-full">
					<p class="ds-empty-title">{$i18n.t('No cases found.')}</p>
					<p class="ds-empty-description max-w-none">{$i18n.t('Items will appear here when available.')}</p>
					<button type="button" class="{DS_BTN_CLASSES.ghost} mt-3 text-sm" on:click={goToCases}>
						Go to Cases →
					</button>
				</div>
			</svelte:fragment>
			<div
				class={occBoardShell ? 'ds-occ-ccase-list' : 'flex flex-col gap-2'}
				data-testid="recent-cases-list"
				role={occBoardShell ? 'list' : undefined}
			>
				{#each recentCases as c (c.id)}
					{#if occBoardShell}
						{@const incidentDisp = formatIncidentDate(c.incident_date)}
						{@const locLine = caseLocationLine(c)}
						{@const updatedIso = readIso(c, 'updated_at') ?? readIso(c, 'created_at')}
						<div class="ds-occ-ccase-row" role="listitem">
							<button
								type="button"
								class="ds-occ-ccase-row__main"
								on:click={() => openCase(c)}
								data-testid="recent-case-item"
								data-case-id={c.id}
								aria-label={$i18n.t('Open case {{number}}', { number: c.case_number })}
							>
								<div class="ds-occ-ccase-row__icon-tile" aria-hidden="true">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="1.5"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5m-13.5 0h1.5m-1.5 0A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-1.5m-13.5 0v-8.25c0-.621.504-1.125 1.125-1.125h4.875c.621 0 1.125.504 1.125 1.125v1.875c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125.504 1.125 1.125V9.75"
										/>
									</svg>
								</div>
								<div class="ds-occ-ccase-row__text">
									<div class="ds-occ-ccase-row__line1">
										<span class="ds-occ-ccase-row__num">#{c.case_number}</span>
										<span class={unitBadgeClass(c.unit)}>{c.unit}</span>
										<span class="ds-occ-ccase-row__title">{c.title}</span>
									</div>
									{#if incidentDisp || locLine}
										<p class="ds-occ-ccase-row__subline">
											{#if incidentDisp}
												<span>{$i18n.t('Incident')}: {incidentDisp}</span>
											{/if}
											{#if incidentDisp && locLine}
												<span class="ds-occ-ccase-row__dot" aria-hidden="true">·</span>
											{/if}
											{#if locLine}
												<span>{locLine}</span>
											{/if}
										</p>
									{/if}
								</div>
								<div class="ds-occ-ccase-row__meta">
									<span class={statusBadgeClass(c.status)}>{c.status}</span>
									{#if formatRelativeUpdated(updatedIso)}
										<span class="ds-occ-ccase-row__updated">
											{$i18n.t('Updated')}
											{formatRelativeUpdated(updatedIso)}
										</span>
									{/if}
								</div>
							</button>
							<button
								type="button"
								class="ds-occ-ccase-row__menu"
								on:click|stopPropagation={() => openCase(c)}
								aria-label={$i18n.t('Open case menu')}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="1.5"
									stroke="currentColor"
									aria-hidden="true"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z"
									/>
								</svg>
							</button>
						</div>
					{:else}
						<button
							type="button"
							class={DS_OCC_CLASSES.resourceRow}
							on:click={() => openCase(c)}
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
					{/if}
				{/each}
			</div>
		</OccStateContainer>
	</div>
{/if}
