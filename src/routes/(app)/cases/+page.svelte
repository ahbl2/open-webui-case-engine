<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { caseEngineToken, caseEngineUser, unitFilter, activeCaseId, activeCaseNumber } from '$lib/stores';
	import { listCases, type CaseEngineCase } from '$lib/apis/caseEngine';
	import { applyCaseBrowse, type CasesBrowseSort } from '$lib/utils/casesBrowse';
	import CreateCaseModal from '$lib/components/case/CreateCaseModal.svelte';
	import EditCaseModal from '$lib/components/case/EditCaseModal.svelte';
	import {
		DS_BADGE_CLASSES,
		DS_BTN_CLASSES,
		DS_COMMAND_CENTER_CLASSES,
		DS_STATUS_SURFACE_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';

	let cases: CaseEngineCase[] = [];
	let selectedUnit: 'ALL' | 'CID' | 'SIU' = 'ALL';
	let selectedStatus: 'ALL' | 'OPEN' | 'CLOSED' = 'ALL';
	let searchQuery = '';
	let sortBy: CasesBrowseSort = 'incident_date_desc';
	let visibleCases: CaseEngineCase[] = [];
	let loading = true;
	let error = '';
	let showCreateCaseModal = false;
	let showEditCaseModal = false;
	let editingCase: CaseEngineCase | null = null;

	function unitBadgeClass(unit: string): string {
		if (unit === 'CID') return DS_BADGE_CLASSES.unitCid;
		if (unit === 'SIU') return DS_BADGE_CLASSES.unitSiu;
		return DS_BADGE_CLASSES.neutral;
	}

	function statusBadgeClass(status: string): string {
		return status === 'OPEN' ? DS_BADGE_CLASSES.success : DS_BADGE_CLASSES.neutral;
	}

	async function loadCases() {
		loading = true;
		error = '';
		try {
			cases = await listCases(selectedUnit, $caseEngineToken!);
		} catch (e) {
			error = (e as Error).message ?? 'Failed to load cases';
		} finally {
			loading = false;
		}
	}

	function openCase(c: CaseEngineCase) {
		activeCaseId.set(c.id);
		activeCaseNumber.set(c.case_number);
		goto(`/case/${c.id}/chat`);
	}

	function openEditCase(c: CaseEngineCase) {
		editingCase = c;
		showEditCaseModal = true;
	}

	function onUnitChange() {
		unitFilter.set(selectedUnit);
		loadCases();
	}

	$: {
		visibleCases = applyCaseBrowse(cases, {
			unit: selectedUnit,
			status: selectedStatus,
			searchQuery,
			sortBy
		});
	}

	$: openCount = cases.filter((c) => c.status === 'OPEN').length;
	$: closedCount = cases.filter((c) => c.status === 'CLOSED').length;

	onMount(() => {
		selectedUnit = $unitFilter ?? 'ALL';
		if ($caseEngineToken) {
			loadCases();
		} else {
			loading = false;
		}
	});
</script>

<div class={DS_COMMAND_CENTER_CLASSES.page}>
	<div class={DS_COMMAND_CENTER_CLASSES.pageInner}>
		<header class={DS_COMMAND_CENTER_CLASSES.header}>
			<div class="flex items-start gap-3 min-w-0">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="size-7 shrink-0 text-[var(--ds-accent)] opacity-90"
					aria-hidden="true"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
					/>
				</svg>
				<div class="min-w-0">
					<h1 class={DS_TYPE_CLASSES.display}>Cases</h1>
					<p class="{DS_TYPE_CLASSES.meta} mt-1 max-w-xl">
						Investigations available under your scope. Open a case to enter the workspace.
					</p>
				</div>
			</div>
			{#if $caseEngineToken}
				<button type="button" class={DS_BTN_CLASSES.primary} on:click={() => (showCreateCaseModal = true)}>
					Create Case
				</button>
			{/if}
		</header>

		{#if !$caseEngineToken}
			<div class="{DS_STATUS_SURFACE_CLASSES.neutral} rounded-[var(--ds-radius-md)] p-8 text-center">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="size-10 mx-auto mb-3 opacity-70"
					aria-hidden="true"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
					/>
				</svg>
				<p class="{DS_TYPE_CLASSES.panel}">Case Engine not connected</p>
				<p class="{DS_TYPE_CLASSES.meta} mt-1">
					Use the Cases section in the sidebar to connect your account.
				</p>
			</div>
		{:else if loading}
			<div class="flex items-center gap-2 {DS_TYPE_CLASSES.meta}">
				<svg class="animate-spin size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
				</svg>
				Loading cases…
			</div>
		{:else if error}
			<div class="{DS_STATUS_SURFACE_CLASSES.danger} rounded-[var(--ds-radius-md)] p-4">
				<p class="{DS_TYPE_CLASSES.panel}">Failed to load cases</p>
				<p class="{DS_TYPE_CLASSES.meta} mt-0.5">{error}</p>
				<button type="button" class="{DS_BTN_CLASSES.secondary} mt-3" on:click={loadCases}>Try again</button>
			</div>
		{:else}
			<div class={DS_COMMAND_CENTER_CLASSES.kpiGrid}>
				<div class={DS_COMMAND_CENTER_CLASSES.kpiTile}>
					<div class={DS_COMMAND_CENTER_CLASSES.kpiValue}>{cases.length}</div>
					<div class={DS_COMMAND_CENTER_CLASSES.kpiLabel}>In scope</div>
				</div>
				<div class={DS_COMMAND_CENTER_CLASSES.kpiTile}>
					<div class={DS_COMMAND_CENTER_CLASSES.kpiValue}>{openCount}</div>
					<div class={DS_COMMAND_CENTER_CLASSES.kpiLabel}>Open</div>
				</div>
				<div class={DS_COMMAND_CENTER_CLASSES.kpiTile}>
					<div class={DS_COMMAND_CENTER_CLASSES.kpiValue}>{closedCount}</div>
					<div class={DS_COMMAND_CENTER_CLASSES.kpiLabel}>Closed</div>
				</div>
				<div class={DS_COMMAND_CENTER_CLASSES.kpiTile}>
					<div class={DS_COMMAND_CENTER_CLASSES.kpiValue}>{visibleCases.length}</div>
					<div class={DS_COMMAND_CENTER_CLASSES.kpiLabel}>Matching filters</div>
				</div>
			</div>

			<div class={DS_COMMAND_CENTER_CLASSES.filterBar}>
				<div class={DS_COMMAND_CENTER_CLASSES.filterGrid}>
					<div>
						<label class={DS_TYPE_CLASSES.label} for="cases-filter-unit">Unit</label>
						<select
							id="cases-filter-unit"
							bind:value={selectedUnit}
							on:change={onUnitChange}
						>
							<option value="ALL">All</option>
							<option value="CID">CID</option>
							<option value="SIU">SIU</option>
						</select>
					</div>
					<div>
						<label class={DS_TYPE_CLASSES.label} for="cases-filter-status">Status</label>
						<select id="cases-filter-status" bind:value={selectedStatus}>
							<option value="ALL">All</option>
							<option value="OPEN">OPEN</option>
							<option value="CLOSED">CLOSED</option>
						</select>
					</div>
					<div>
						<label class={DS_TYPE_CLASSES.label} for="cases-filter-search">Search</label>
						<input
							id="cases-filter-search"
							type="text"
							placeholder="Case number or title"
							bind:value={searchQuery}
						/>
					</div>
					<div>
						<label class={DS_TYPE_CLASSES.label} for="cases-filter-sort">Sort</label>
						<select id="cases-filter-sort" bind:value={sortBy}>
							<option value="created_desc">Created date newest</option>
							<option value="created_asc">Created date oldest</option>
							<option value="case_number_asc">Case number A-Z</option>
							<option value="incident_date_desc">Incident date newest</option>
							<option value="incident_date_asc">Incident date oldest</option>
						</select>
					</div>
				</div>
			</div>

			{#if visibleCases.length === 0}
				<div
					class="{DS_STATUS_SURFACE_CLASSES.neutral} rounded-[var(--ds-radius-md)] p-8 text-center"
				>
					<p class="{DS_TYPE_CLASSES.body}">No cases match your current filters.</p>
				</div>
			{:else}
				<div class="flex flex-col gap-3">
					{#each visibleCases as c (c.id)}
						<div class={DS_COMMAND_CENTER_CLASSES.caseListCard}>
							<button
								type="button"
								class={DS_COMMAND_CENTER_CLASSES.caseListOpen}
								on:click={() => openCase(c)}
							>
								<div class="{DS_COMMAND_CENTER_CLASSES.caseListMeta} mb-1.5">
									<span class="{DS_TYPE_CLASSES.mono} truncate max-w-[12rem]">{c.case_number}</span>
									<span class={unitBadgeClass(c.unit)}>{c.unit}</span>
									<span class={statusBadgeClass(c.status)}>{c.status}</span>
								</div>
								<p
									class="{DS_TYPE_CLASSES.panel} overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] break-words"
								>
									{c.title ?? '(untitled)'}
								</p>
								{#if c.incident_date}
									<p class="{DS_TYPE_CLASSES.meta} mt-1.5 truncate">
										Incident: {c.incident_date}
									</p>
								{:else}
									<p class="{DS_TYPE_CLASSES.meta} mt-1.5 truncate opacity-90">Incident date missing</p>
								{/if}
							</button>
							<div class={DS_COMMAND_CENTER_CLASSES.caseListActions}>
								<button
									type="button"
									class={DS_BTN_CLASSES.secondary}
									on:click|stopPropagation={() => openEditCase(c)}
								>
									Edit
								</button>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="1.5"
									stroke="currentColor"
									class="size-4 shrink-0 mt-1.5 opacity-40"
									aria-hidden="true"
								>
									<path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
								</svg>
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<p class="{DS_TYPE_CLASSES.meta} mt-4 text-right">
				{visibleCases.length} of {cases.length} case{cases.length !== 1 ? 's' : ''} · connected as
				<span class="font-medium text-[var(--ds-text-secondary)]">{$caseEngineUser?.name ?? '…'}</span>
			</p>
		{/if}
	</div>
</div>

<CreateCaseModal
	show={showCreateCaseModal}
	token={$caseEngineToken}
	on:close={() => (showCreateCaseModal = false)}
	on:created={(event) => {
		showCreateCaseModal = false;
		loadCases();
		const created = event.detail;
		if (created?.id) {
			activeCaseId.set(created.id);
			activeCaseNumber.set(created.case_number);
			goto(`/case/${created.id}/chat`);
		}
	}}
/>

<EditCaseModal
	show={showEditCaseModal}
	token={$caseEngineToken}
	caseData={editingCase}
	on:close={() => {
		showEditCaseModal = false;
		editingCase = null;
	}}
	on:saved={(event) => {
		const saved = event.detail.case as CaseEngineCase;
		cases = cases.map((c) => (c.id === saved.id ? saved : c));
		editingCase = saved;
		if ($activeCaseId === saved.id) {
			activeCaseNumber.set(saved.case_number);
		}
		showEditCaseModal = false;
	}}
/>
