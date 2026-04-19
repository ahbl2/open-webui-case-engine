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
	import { EllipsisVerticalIcon, FolderOpenIcon } from 'heroicons-svelte/24/solid';

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

	function readStr(c: CaseEngineCase, key: string): string {
		const v = (c as Record<string, unknown>)[key];
		return typeof v === 'string' && v.trim() ? v.trim() : '';
	}

	/** Street-only segment: text before first comma when `location_text` is "street, city, ST …". */
	function streetFromLocationTextLine(full: string): string {
		const t = full.trim();
		if (!t) return '';
		const i = t.indexOf(',');
		if (i === -1) return t;
		return t.slice(0, i).trim();
	}

	/** CID: dedicated street fields when present; else first segment of `location_text`. */
	function cidPrimaryStreet(c: CaseEngineCase): string {
		return (
			readStr(c, 'primary_location_street') ||
			readStr(c, 'primary_street_address') ||
			readStr(c, 'street_address') ||
			streetFromLocationTextLine(readStr(c, 'location_text'))
		);
	}

	/** SIU: dedicated suspect fields when backend adds them. */
	function siuPrimarySuspect(c: CaseEngineCase): string {
		return readStr(c, 'primary_suspect') || readStr(c, 'primary_suspect_name');
	}

	function formatIncidentDate(iso: string | null | undefined): string {
		if (!iso) return '';
		const d = String(iso).slice(0, 10);
		const [y, m, day] = d.split('-');
		if (!y || !m || !day) return '';
		return `${m}/${day}/${y}`;
	}

	/** Relative age since `iso` (hours → days → weeks → years); never a calendar date. */
	function formatRelativeUpdated(iso: string | undefined): string {
		if (!iso) return '';
		const ms = Date.parse(iso);
		if (Number.isNaN(ms)) return '';
		const diffMs = Math.max(0, Date.now() - ms);
		const sec = Math.floor(diffMs / 1000);
		const min = Math.floor(sec / 60);
		const hr = Math.floor(min / 60);
		const day = Math.floor(hr / 24);
		const week = Math.floor(day / 7);
		const year = Math.floor(day / 365);

		if (day >= 365) {
			return year < 2 ? '1y ago' : `${year}y ago`;
		}
		if (day >= 7) {
			return week < 2 ? '1w ago' : `${week}w ago`;
		}
		if (day >= 1) {
			return day === 1 ? '1d ago' : `${day}d ago`;
		}
		if (hr >= 1) {
			return hr === 1 ? '1h ago' : `${hr}h ago`;
		}
		if (min >= 1) {
			return min === 1 ? '1m ago' : `${min}m ago`;
		}
		return 'just now';
	}

	function unitBadgeClass(unit: string): string {
		const u = String(unit).toUpperCase();
		if (u === 'SIU') return DS_BADGE_CLASSES.unitSiu;
		if (u === 'CID') return DS_BADGE_CLASSES.unitCid;
		return DS_BADGE_CLASSES.neutral;
	}

	function openCase(c: CaseEngineCase): void {
		void goto(`/case/${c.id}/summary`);
	}
</script>

<div class={boardShellHeaderClass}>
	<div class={DS_OCC_CLASSES.sectionHeaderRow}>
		<div class={DS_OCC_CLASSES.sectionHeaderTitle}>
			<FolderOpenIcon
				class="size-4 shrink-0 text-[color:var(--ds-text-muted)]"
				aria-hidden="true"
			/>
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
									<FolderOpenIcon class="h-[1.125rem] w-[1.125rem]" />
								</div>
								<div class="ds-occ-ccase-row__text">
									<div class="ds-occ-ccase-row__line1">
										<span class="ds-occ-ccase-row__num">#{c.case_number}</span>
										<span class="ds-occ-ccase-row__title">{c.title}</span>
									</div>
									<p class="ds-occ-ccase-row__subline">
										<span>{$i18n.t('Incident')}: {incidentDisp || '—'}</span>
										<span class="ds-occ-ccase-row__dot" aria-hidden="true">·</span>
										<span>
											{#if String(c.unit ?? '').toUpperCase() === 'SIU'}
												{siuPrimarySuspect(c) || $i18n.t('Primary suspect pending')}
											{:else}
												{cidPrimaryStreet(c) || $i18n.t('Primary location pending')}
											{/if}
										</span>
									</p>
								</div>
								<div class="ds-occ-ccase-row__meta">
									<span class={unitBadgeClass(c.unit)}>{c.unit}</span>
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
								<EllipsisVerticalIcon class="h-4 w-4" aria-hidden="true" />
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
