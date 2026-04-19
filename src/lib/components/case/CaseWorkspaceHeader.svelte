<script lang="ts">
	/**
	 * P82-02 — Case workspace header + compact context strip (identity + optional metadata + pending proposals).
	 * Dashboard mock: hero backdrop, breadcrumb, in-case search, metadata row, Quick actions.
	 * P87-03 / P87-05 — Tasks (Operational) entry remains navigation-only (`<a href>`) with canonical tooltip.
	 */
	import { goto } from '$app/navigation';
	import { FolderIcon } from 'heroicons-svelte/24/solid';
	import Search from '$lib/components/icons/Search.svelte';
	import ChevronLeft from '$lib/components/icons/ChevronLeft.svelte';
	import { occHeroIconClass } from '$lib/components/icons/occ/occHeroIconDefaults';
	import { caseEngineUser } from '$lib/stores/caseEngine';
	import { P128_HEADER_PENDING_PROPOSALS_LINK_TITLE } from '$lib/caseContext/p128ProposalFramingCopy';
	import {
		DS_APP_SHELL_CLASSES,
		DS_BADGE_CLASSES,
		DS_BTN_CLASSES,
		DS_CASE_SHELL_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import { caseStatusDsBadgeCompound, displayCaseTitle } from '$lib/utils/caseIdentityStrip';
	import { formatCaseDateTime } from '$lib/utils/formatDateTime';
	import type { CaseMeta } from '$lib/stores/caseEngine';
	import type { CaseEngineUiState } from '$lib/utils/caseEngineUiState';
	import OccHeroCitySkyline from '$lib/components/operator/OccHeroCitySkyline.svelte';

	export let caseId: string;
	export let loading: boolean;
	export let loadError: string;
	export let meta: CaseMeta | null;
	export let shellHeaderDataUiState: CaseEngineUiState | '';
	export let identityStripExpanded: boolean;
	export let wave3CaseShellEnabled: boolean;
	export let pendingProposalsShellCount: number | null;
	/** Sit inside unified `ds-occ-dashboard-surface` in `case/[id]/+layout` — drop outer chrome edge. */
	export let occSheetEmbedded = false;
	/** Identity row: `OccHeroCitySkyline` behind case number / status (toolbar stays solid). Same asset as `/home`. */
	export let occHeroBannerStack = false;
	export let onEdit: () => void;
	/** P119 case export modal — layout enables when meta + token exist and section is not Overview-only. */
	export let exportCaseEnabled = false;
	export let onExportCase: () => void = () => {};

	let searchDraft = '';

	$: updatedAtLabel =
		meta?.updated_at && String(meta.updated_at).trim()
			? formatCaseDateTime(String(meta.updated_at))
			: '';
	$: showContextStrip =
		pendingProposalsShellCount !== null && pendingProposalsShellCount > 0;

	function statusDisplay(status: string): string {
		const u = status?.trim().toUpperCase();
		return u === 'OPEN' ? 'ACTIVE' : status;
	}

	function unitBadgeClass(unit: string): string {
		const u = unit.trim().toUpperCase();
		if (u === 'CID') return `${DS_BADGE_CLASSES.base} ${DS_BADGE_CLASSES.unitCid}`;
		if (u === 'SIU') return `${DS_BADGE_CLASSES.base} ${DS_BADGE_CLASSES.unitSiu}`;
		return `${DS_BADGE_CLASSES.base} ${DS_BADGE_CLASSES.info}`;
	}

	function onSearchKeydown(e: KeyboardEvent) {
		if (e.key !== 'Enter' || !caseId.trim()) return;
		const q = searchDraft.trim();
		const path = `/case/${encodeURIComponent(caseId)}/query`;
		void goto(q ? `${path}?q=${encodeURIComponent(q)}` : path);
	}
</script>

{#snippet caseIdentityHeader()}
	<header
		class="ce-l-identity-bar flex flex-wrap items-start gap-x-2 gap-y-2 px-3 sm:items-center {identityStripExpanded
			? 'py-3 sm:min-h-[3.5rem]'
			: 'py-2.5 sm:min-h-12 sm:py-2'}"
		aria-label="Case identity"
		data-testid="case-identity-bar"
		data-case-identity-posture={identityStripExpanded ? 'expanded' : 'compact'}
		data-region={wave3CaseShellEnabled ? 'case-shell-identity' : undefined}
	>
		{#if loading && !meta}
			<span
				class="text-sm animate-pulse text-[color:var(--ce-l-text-muted)]"
				data-testid="case-shell-loading"
				data-case-engine-ui-state={shellHeaderDataUiState}
			>Loading…</span>
		{:else if loadError}
			<span
				class="text-sm text-red-500 dark:text-red-400"
				data-testid="case-shell-load-error"
				data-case-engine-ui-state={shellHeaderDataUiState}
			>
				{loadError}
			</span>
		{:else if meta}
			<div
				class="flex w-full min-w-0 flex-col gap-3"
				data-testid="case-shell-loaded"
				data-case-engine-ui-state={shellHeaderDataUiState}
			>
				<div class="flex min-w-0 flex-col gap-2 {identityStripExpanded ? 'sm:gap-2.5' : 'gap-1.5'}">
					<div
						class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1"
						data-testid="case-identity-primary"
					>
						<h1
							class="{DS_TYPE_CLASSES.mono} min-w-0 max-w-full shrink-0 select-all text-base font-bold uppercase tracking-wide text-[color:var(--ce-l-text-primary)] sm:text-lg md:text-xl"
							title={meta.case_number}
						>
							{meta.case_number}
						</h1>
						<span
							class="{DS_TYPE_CLASSES.body} min-w-0 max-w-full flex-1 basis-[min(100%,12rem)] font-medium leading-snug text-[color:var(--ce-l-text-secondary)] sm:max-w-xl md:max-w-2xl {identityStripExpanded
								? 'text-base sm:text-lg'
								: 'text-sm sm:text-base'}"
							title={displayCaseTitle(meta.title)}
						>
							{displayCaseTitle(meta.title)}
						</span>
						{#if meta.unit?.trim()}
							<span class="{unitBadgeClass(meta.unit)} max-w-[14rem] shrink-0 truncate" title={meta.unit}>
								{meta.unit.trim()}
							</span>
						{/if}
						{#if meta.status?.trim()}
							<span class={caseStatusDsBadgeCompound(meta.status)}>
								{statusDisplay(meta.status)}
							</span>
						{:else}
							<span class="{DS_BADGE_CLASSES.base} {DS_BADGE_CLASSES.neutral}">No status</span>
						{/if}
					</div>
					<div
						class="flex w-full max-w-4xl flex-wrap items-center gap-x-3 gap-y-1 border-t border-[color:var(--ce-l-chrome-border)]/60 pt-3"
						data-testid="case-identity-secondary"
						aria-label="Case metadata"
					>
						<span
							class="{DS_TYPE_CLASSES.meta} min-w-0 text-[color:var(--ce-l-text-secondary)]"
							title={$caseEngineUser?.name?.trim() ? $caseEngineUser.name : undefined}
						>
							<span class="text-[color:var(--ce-l-text-muted)]">Lead Detective</span>
							<span class="ml-1 font-medium text-[color:var(--ce-l-text-primary)]">
								{$caseEngineUser?.name?.trim() ? $caseEngineUser.name : '—'}
							</span>
						</span>
						{#if meta.incident_date}
							<span class="{DS_TYPE_CLASSES.meta} text-[color:var(--ce-l-text-secondary)]">
								Incident {meta.incident_date}
							</span>
						{:else}
							<span class="{DS_TYPE_CLASSES.meta} text-[color:var(--ce-l-text-muted)]">No incident date</span>
						{/if}
						<span class="{DS_TYPE_CLASSES.meta} text-[color:var(--ce-l-text-secondary)]">
							Last updated {updatedAtLabel || '—'}
						</span>
					</div>
				</div>
			</div>
		{/if}
	</header>
{/snippet}

<div
	class="relative flex w-full shrink-0 flex-col {occSheetEmbedded
		? occHeroBannerStack
			? 'border-0 bg-transparent'
			: 'rounded-t-[var(--ds-radius-lg)] border-0 bg-transparent'
		: 'border-b border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-chrome)]'}"
	data-testid="case-workspace-header"
	data-region="case-shell-header-stack"
	data-case-header-occ-embedded={occSheetEmbedded ? 'true' : undefined}
	data-case-header-hero-banner-stack={occHeroBannerStack ? 'true' : undefined}
>
	{#if !occHeroBannerStack}
		<div class="pointer-events-none absolute inset-0 z-0 bg-[color:var(--ce-l-chrome)]" aria-hidden="true"></div>
		<div
			class="pointer-events-none absolute inset-0 z-0 bg-cover bg-center opacity-[0.18] sm:opacity-[0.24]"
			style="background-image: url('/detective/occ-city-banner.jpg')"
			aria-hidden="true"
		></div>
		<div
			class="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-[color:var(--ce-l-chrome)]/90 via-[color:var(--ce-l-chrome)]/94 to-[color:var(--ce-l-chrome)]"
			aria-hidden="true"
		></div>
	{/if}

	<div class="relative z-[2] flex min-w-0 flex-col">
		<header
			class="{DS_APP_SHELL_CLASSES.top} shrink-0 {occHeroBannerStack ? 'relative z-[3]' : ''}"
			aria-label="Case workspace top bar"
			data-region="case-shell-app-top"
			data-case-shell-app-top={occHeroBannerStack ? 'true' : undefined}
			data-testid="case-shell-app-top"
		>
			<div class="{DS_APP_SHELL_CLASSES.topRow}">
				<div
					class="grid min-w-0 w-full grid-cols-[minmax(0,1fr)_minmax(0,28rem)_minmax(0,1fr)] items-center gap-2 sm:gap-3"
					data-testid="case-shell-hero-toolbar"
				>
					<div class="flex min-w-0 max-w-[min(100%,12rem)] flex-row flex-wrap items-center gap-2 justify-self-start sm:max-w-[14rem]">
						<button
							type="button"
							class="inline-flex shrink-0 items-center gap-1 rounded-[var(--ds-radius-sm)] px-1.5 py-1 text-[length:var(--ds-type-meta-size)] font-semibold leading-tight text-[color:var(--ds-text-on-canvas)] transition-colors hover:bg-[color:var(--ds-bg-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ds-focus-ring)] focus-visible:ring-offset-2"
							on:click={() => goto('/cases')}
							aria-label="Back to cases"
						>
							<ChevronLeft className="size-4 shrink-0 opacity-90" />
							<span class="truncate">Cases</span>
						</button>
						<span class="text-[color:var(--ds-text-muted)]" aria-hidden="true">›</span>
						{#if meta?.case_number}
							<span
								class="{DS_TYPE_CLASSES.mono} max-w-[min(100%,14rem)] truncate text-[length:var(--ds-type-meta-size)] font-medium leading-tight text-[color:var(--ds-text-muted)]"
								title={meta.case_number}
							>
								{meta.case_number}
							</span>
						{/if}
					</div>

					<div class="flex min-w-0 w-full justify-center justify-self-center">
						<label class="sr-only" for="case-shell-in-case-search">Search in this case</label>
						<div class="{DS_APP_SHELL_CLASSES.topSearchComposite} !max-w-none w-full">
							<Search className="size-4 shrink-0 opacity-85" strokeWidth="1.5" />
							<input
								id="case-shell-in-case-search"
								type="search"
								bind:value={searchDraft}
								placeholder="Search in this case…"
								class="min-w-0 flex-1"
								autocomplete="off"
								data-testid="case-shell-in-case-search"
								on:keydown={onSearchKeydown}
							/>
						</div>
					</div>

					<div class="{DS_APP_SHELL_CLASSES.topActions} flex flex-wrap justify-end gap-1.5 justify-self-end sm:gap-2">
						{#if exportCaseEnabled}
							<button
								type="button"
								class="{DS_BTN_CLASSES.secondary} !min-h-[1.625rem] shrink-0 px-2.5 py-1 text-[length:var(--ds-type-meta-size)] leading-tight"
								data-testid="case-export-open"
								on:click={onExportCase}
							>
								Export case
							</button>
						{/if}
				<details class="group relative">
					<summary
						class="{DS_BTN_CLASSES.secondary} !min-h-[1.625rem] list-none cursor-pointer px-2.5 py-1 text-[length:var(--ds-type-meta-size)] leading-tight [&::-webkit-details-marker]:hidden"
						data-testid="case-shell-quick-actions-trigger"
					>
						Quick actions
					</summary>
					<ul
						class="absolute right-0 z-30 mt-1 min-w-[12rem] rounded-md border border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-chrome)] py-1 text-sm shadow-lg"
						role="menu"
					>
						<li>
							<a
								href={`/case/${caseId}/tasks`}
								class="{DS_BTN_CLASSES.ghost} block w-full rounded-none border-0 px-3 py-2 text-left text-sm hover:bg-[color:var(--ce-l-surface-muted)]"
								data-testid="case-workspace-header-tasks-link"
								title="Operational tasks — not part of the official Timeline"
								role="menuitem"
							>Tasks (Operational)</a>
						</li>
						<li>
							<a
								href={`/case/${encodeURIComponent(caseId)}/notes`}
								class="block px-3 py-2 hover:bg-[color:var(--ce-l-surface-muted)]"
								role="menuitem"
							>Notes</a>
						</li>
						<li>
							<a
								href={`/case/${encodeURIComponent(caseId)}/files`}
								class="block px-3 py-2 hover:bg-[color:var(--ce-l-surface-muted)]"
								role="menuitem"
							>Files</a>
						</li>
						<li>
							<a
								href={`/case/${encodeURIComponent(caseId)}/timeline`}
								class="block px-3 py-2 hover:bg-[color:var(--ce-l-surface-muted)]"
								role="menuitem"
							>Timeline</a>
						</li>
					</ul>
				</details>
				<button
					type="button"
					class="{DS_BTN_CLASSES.secondary} !min-h-[1.625rem] shrink-0 px-2.5 py-1 text-[length:var(--ds-type-meta-size)] leading-tight"
					data-testid="case-shell-edit"
					on:click={onEdit}
				>
					Edit case
				</button>
					</div>
				</div>
			</div>
		</header>

		{#if occHeroBannerStack}
			<!-- Same OCC shell layering as `/home` + `/cases`: `OperatorCommandCenterFrame` wraps `header.ds-occ-hero-band` → banner → stack. -->
			<header
				class="ds-occ-hero-band"
				data-region="occ-hero-band"
				data-testid="case-shell-occ-hero-band"
			>
				<div
					class="ds-occ-dashboard-hero-banner case-shell-identity-hero-banner"
					data-testid="case-shell-hero-banner"
					data-region="case-shell-hero-banner"
				>
					<div class="ds-occ-dashboard-hero-banner__stack">
						<OccHeroCitySkyline />
						<div class="ds-occ-hero-band__inner ds-occ-hero-band__inner--on-banner w-full">
							{#if loading && !meta}
								<div class="flex items-center gap-3 min-w-0 flex-1">
									<span
										class="{DS_TYPE_CLASSES.meta} animate-pulse text-[color:var(--ds-text-on-canvas)]"
										data-testid="case-shell-loading"
										data-case-engine-ui-state={shellHeaderDataUiState}
									>Loading…</span>
								</div>
							{:else if loadError}
								<div class="flex items-center gap-3 min-w-0 flex-1">
									<p
										class="text-sm text-red-500 dark:text-red-400"
										data-testid="case-shell-load-error"
										data-case-engine-ui-state={shellHeaderDataUiState}
									>
										{loadError}
									</p>
								</div>
							{:else if meta}
								<div
									class="flex items-center gap-3 min-w-0 flex-1"
									data-testid="case-shell-loaded"
									data-case-engine-ui-state={shellHeaderDataUiState}
								>
									<FolderIcon
										class="{occHeroIconClass.hero} shrink-0 text-[color:var(--ds-accent)] opacity-90"
										aria-hidden="true"
									/>
									<div class="min-w-0">
										<div
											class="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-3"
										>
											<h1
												id="case-shell-hero-heading"
												class="{DS_TYPE_CLASSES.display} shrink-0 font-mono uppercase tracking-wide"
												data-testid="case-shell-hero-heading"
											>
												{meta.case_number}
											</h1>
											<span class="{DS_TYPE_CLASSES.meta} min-w-0">
												<span class="text-[color:var(--ds-text-muted)]">Lead Detective</span>
												{$caseEngineUser?.name?.trim()
													? ` ${$caseEngineUser.name}`
													: ' —'}
											</span>
										</div>
										<p class="{DS_TYPE_CLASSES.meta} mt-1 max-w-2xl">
											<span class="font-medium text-[color:var(--ds-text-primary)]">{displayCaseTitle(meta.title)}</span>
											{#if meta.incident_date}
												<span> · Incident {meta.incident_date}</span>
											{:else}
												<span class="text-[color:var(--ds-text-muted)]"> · No incident date</span>
											{/if}
											<span> · Last updated {updatedAtLabel || '—'}</span>
										</p>
									</div>
								</div>
								<div class="ds-occ-hero-actions">
									{#if meta.unit?.trim()}
										<span class="{unitBadgeClass(meta.unit)} max-w-[12rem] truncate" title={meta.unit.trim()}>
											{meta.unit.trim()}
										</span>
									{/if}
									{#if meta.status?.trim()}
										<span class={caseStatusDsBadgeCompound(meta.status)}>
											{statusDisplay(meta.status)}
										</span>
									{:else}
										<span class="{DS_BADGE_CLASSES.base} {DS_BADGE_CLASSES.neutral}">No status</span>
									{/if}
								</div>
							{/if}
						</div>
					</div>
				</div>
			</header>
		{:else}
			{@render caseIdentityHeader()}
		{/if}

		{#if meta && !loadError && !loading && showContextStrip}
			<div
				class="{DS_CASE_SHELL_CLASSES.contextBand} flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-[color:var(--ce-l-chrome-border)]"
				role="region"
				aria-label="Case context"
				data-testid="case-shell-context-band"
				data-region={wave3CaseShellEnabled ? 'case-shell-context-band' : undefined}
			>
				<div class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1"></div>
				{#if pendingProposalsShellCount !== null && pendingProposalsShellCount > 0}
					<a
						href={`/case/${caseId}/proposals`}
						class="inline-flex max-w-full min-w-0 shrink-0 items-center gap-2 rounded-md px-1 py-0.5 text-[color:var(--ce-l-text-primary)] outline-none ring-offset-2 transition-colors hover:bg-[color:var(--ce-l-surface-muted)] focus-visible:ring-2 focus-visible:ring-[color:var(--ce-l-tab-active-border)]"
						data-testid="case-shell-context-band-pending-proposals"
						title={P128_HEADER_PENDING_PROPOSALS_LINK_TITLE}
					>
						<span class="{DS_BADGE_CLASSES.warning} tabular-nums">{pendingProposalsShellCount}</span>
						<span class="{DS_TYPE_CLASSES.meta} text-[color:var(--ce-l-text-secondary)]">Pending proposals</span>
					</a>
				{/if}
			</div>
		{/if}
	</div>
</div>
