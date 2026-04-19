<script lang="ts">
	/**
	 * Case overview — full-width Assets band below the three dashboard columns.
	 * Sources: GET /cases/:id/case-entities (P126 entity types); client-side buckets + paging.
	 */
	import { onDestroy } from 'svelte';
	import { caseEngineToken } from '$lib/stores';
	import {
		getCaseEntitiesList,
		type CaseEngineCaseEntity
	} from '$lib/apis/caseEngine/caseEntitiesApi';
	import CaseLoadingState from '$lib/components/case/CaseLoadingState.svelte';
	import { P129_ACTIVITY_LIST_LOAD_MORE } from '$lib/caseContext/p129ActivityListCopy';
	import {
		DS_BTN_CLASSES,
		DS_EMPTY_CLASSES,
		DS_STACK_CLASSES,
		DS_STATUS_SURFACE_CLASSES,
		DS_SUMMARY_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';

	export let caseId: string;
	export let sectionId = 'summary-module-case-assets';
	export let headingElementId = 'case-overview-assets-heading';
	export let testId = 'case-overview-assets';

	const PAGE_SIZE = 20;
	/** Scroll viewport height ≈ five list rows (row ~2.65rem with padding). */
	const COLUMN_SCROLL_MAX_CLASS = 'max-h-[13.25rem]';

	function normType(t: string): string {
		return String(t ?? '')
			.trim()
			.toLowerCase();
	}

	function involvementLine(attrs: Record<string, unknown> | undefined): string | null {
		if (!attrs || typeof attrs !== 'object') return null;
		const raw = attrs.role ?? attrs.involvement ?? attrs.classification;
		if (typeof raw === 'string' && raw.trim()) return raw.trim();
		return null;
	}

	function bucketEntities(rows: CaseEngineCaseEntity[]): {
		people: CaseEngineCaseEntity[];
		locations: CaseEngineCaseEntity[];
		vehicles: CaseEngineCaseEntity[];
		phones: CaseEngineCaseEntity[];
	} {
		const people: CaseEngineCaseEntity[] = [];
		const locations: CaseEngineCaseEntity[] = [];
		const vehicles: CaseEngineCaseEntity[] = [];
		const phones: CaseEngineCaseEntity[] = [];
		for (const e of rows) {
			const t = normType(e.entity_type);
			if (t === 'person') people.push(e);
			else if (t === 'address') locations.push(e);
			else if (t === 'vehicle') vehicles.push(e);
			else if (t === 'phone') phones.push(e);
		}
		return { people, locations, vehicles, phones };
	}

	type LoadState =
		| { kind: 'idle' }
		| { kind: 'loading' }
		| { kind: 'ready'; all: CaseEngineCaseEntity[] }
		| { kind: 'error'; message: string };

	let loadGeneration = 0;
	let state: LoadState = { kind: 'idle' };

	let nPeople = PAGE_SIZE;
	let nLocations = PAGE_SIZE;
	let nVehicles = PAGE_SIZE;
	let nPhones = PAGE_SIZE;

	async function loadEntities(id: string, token: string, gen: number): Promise<void> {
		state = { kind: 'loading' };
		nPeople = PAGE_SIZE;
		nLocations = PAGE_SIZE;
		nVehicles = PAGE_SIZE;
		nPhones = PAGE_SIZE;
		try {
			const all = await getCaseEntitiesList(id, token);
			if (gen !== loadGeneration) return;
			state = { kind: 'ready', all };
		} catch (e: unknown) {
			if (gen !== loadGeneration) return;
			state = {
				kind: 'error',
				message: e instanceof Error ? e.message : 'Could not load case entities.'
			};
		}
	}

	$: token = $caseEngineToken;

	$: if (caseId && token) {
		loadGeneration += 1;
		const gen = loadGeneration;
		void loadEntities(caseId, token, gen);
	} else {
		loadGeneration += 1;
		state = { kind: 'idle' };
	}

	onDestroy(() => {
		loadGeneration += 1;
	});

	$: buckets =
		state.kind === 'ready' ? bucketEntities(state.all) : { people: [], locations: [], vehicles: [], phones: [] };

	$: peopleShown = buckets.people.slice(0, nPeople);
	$: locationsShown = buckets.locations.slice(0, nLocations);
	$: vehiclesShown = buckets.vehicles.slice(0, nVehicles);
	$: phonesShown = buckets.phones.slice(0, nPhones);

	$: peopleHasMore = buckets.people.length > nPeople;
	$: locationsHasMore = buckets.locations.length > nLocations;
	$: vehiclesHasMore = buckets.vehicles.length > nVehicles;
	$: phonesHasMore = buckets.phones.length > nPhones;
</script>

<section
	id={sectionId}
	class="{DS_STACK_CLASSES.stack} pb-6 pt-2"
	data-testid={testId}
	aria-labelledby={headingElementId}
>
	<div class="{DS_SUMMARY_CLASSES.modulePrimary} flex min-w-0 flex-col gap-4">
		<div class="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
			<h2 id={headingElementId} class="{DS_TYPE_CLASSES.panel} m-0 min-w-0 flex-1">
				Assets
			</h2>
			<a
				href={`/case/${caseId}/entities`}
				class="shrink-0 whitespace-nowrap text-sm font-medium text-[color:var(--ce-l-text-primary)] underline-offset-2 hover:underline"
				data-testid="case-overview-assets-view-all"
			>
				View all entities →
			</a>
		</div>

		{#if !token}
			<p class="{DS_TYPE_CLASSES.meta} text-[color:var(--ce-l-text-secondary)]" data-testid="case-overview-assets-no-token">
				Case Engine connection is required to load assets for this case.
			</p>
		{:else if state.kind === 'loading' || state.kind === 'idle'}
			<div data-testid="case-overview-assets-loading">
				<CaseLoadingState label="Loading assets…" testId="case-overview-assets-spinner" />
			</div>
		{:else if state.kind === 'error'}
			<div
				class="rounded-md px-3 py-2 text-sm {DS_STATUS_SURFACE_CLASSES.error}"
				role="alert"
				data-testid="case-overview-assets-error"
			>
				<p class="ds-status-copy">{state.message}</p>
			</div>
		{:else if state.kind === 'ready'}
			<div
				class="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
				data-testid="case-overview-assets-grid"
			>
				<!-- People -->
				<div class="flex min-h-0 min-w-0 flex-col gap-2" data-testid="case-overview-assets-col-people">
					<h3 class="{DS_TYPE_CLASSES.meta} m-0 font-semibold uppercase tracking-wide text-[color:var(--ce-l-text-muted)]">
						People
					</h3>
					<p class="{DS_TYPE_CLASSES.meta} m-0 text-[color:var(--ce-l-text-muted)]">
						Victims, suspects, and others involved (case entities: person)
					</p>
					<div
						class="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface)]"
					>
						<div
							class="min-h-0 overflow-y-auto overflow-x-hidden {COLUMN_SCROLL_MAX_CLASS} px-2 py-2"
							data-testid="case-overview-assets-people-scroll"
						>
							{#if buckets.people.length === 0}
								<p class="{DS_EMPTY_CLASSES.description} m-0 text-sm">No people recorded yet.</p>
							{:else}
								<ul class="m-0 flex list-none flex-col gap-1.5 p-0" aria-label="People">
									{#each peopleShown as ent (ent.id)}
										<li>
											<a
												href={`/case/${caseId}/entities/${encodeURIComponent(ent.id)}`}
												class="block rounded-md border border-transparent px-1.5 py-1.5 text-left transition hover:border-[color:var(--ce-l-border-subtle)] hover:bg-[color:var(--ce-l-surface-muted)]"
												data-testid="case-overview-assets-people-row"
											>
												<span class="text-sm font-medium leading-snug text-[color:var(--ce-l-text-primary)]">
													{ent.display_label?.trim() || 'Person'}
												</span>
												{#if involvementLine(ent.attributes)}
													<span
														class="mt-0.5 block text-[0.6875rem] leading-tight text-[color:var(--ce-l-text-muted)]"
													>
														{involvementLine(ent.attributes)}
													</span>
												{/if}
											</a>
										</li>
									{/each}
								</ul>
								{#if peopleHasMore}
									<div class="mt-2 border-t border-[color:var(--ce-l-border-subtle)] pt-2">
										<button
											type="button"
											class="{DS_BTN_CLASSES.secondary} w-full"
											data-testid="case-overview-assets-people-load-more"
											on:click={() => (nPeople = Math.min(nPeople + PAGE_SIZE, buckets.people.length))}
										>
											{P129_ACTIVITY_LIST_LOAD_MORE}
										</button>
									</div>
								{/if}
							{/if}
						</div>
					</div>
				</div>

				<!-- Locations -->
				<div class="flex min-h-0 min-w-0 flex-col gap-2" data-testid="case-overview-assets-col-locations">
					<h3 class="{DS_TYPE_CLASSES.meta} m-0 font-semibold uppercase tracking-wide text-[color:var(--ce-l-text-muted)]">
						Locations
					</h3>
					<div
						class="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface)]"
					>
						<div
							class="min-h-0 overflow-y-auto overflow-x-hidden {COLUMN_SCROLL_MAX_CLASS} px-2 py-2"
							data-testid="case-overview-assets-locations-scroll"
						>
							{#if buckets.locations.length === 0}
								<p class="{DS_EMPTY_CLASSES.description} m-0 text-sm">No locations recorded yet.</p>
							{:else}
								<ul class="m-0 flex list-none flex-col gap-1.5 p-0" aria-label="Locations">
									{#each locationsShown as ent (ent.id)}
										<li>
											<a
												href={`/case/${caseId}/entities/${encodeURIComponent(ent.id)}`}
												class="block rounded-md border border-transparent px-1.5 py-1.5 text-sm leading-snug text-[color:var(--ce-l-text-primary)] transition hover:border-[color:var(--ce-l-border-subtle)] hover:bg-[color:var(--ce-l-surface-muted)]"
												data-testid="case-overview-assets-locations-row"
											>
												{ent.display_label?.trim() || 'Location'}
											</a>
										</li>
									{/each}
								</ul>
								{#if locationsHasMore}
									<div class="mt-2 border-t border-[color:var(--ce-l-border-subtle)] pt-2">
										<button
											type="button"
											class="{DS_BTN_CLASSES.secondary} w-full"
											data-testid="case-overview-assets-locations-load-more"
											on:click={() =>
												(nLocations = Math.min(nLocations + PAGE_SIZE, buckets.locations.length))}
										>
											{P129_ACTIVITY_LIST_LOAD_MORE}
										</button>
									</div>
								{/if}
							{/if}
						</div>
					</div>
				</div>

				<!-- Vehicles -->
				<div class="flex min-h-0 min-w-0 flex-col gap-2" data-testid="case-overview-assets-col-vehicles">
					<h3 class="{DS_TYPE_CLASSES.meta} m-0 font-semibold uppercase tracking-wide text-[color:var(--ce-l-text-muted)]">
						Vehicles
					</h3>
					<div
						class="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface)]"
					>
						<div
							class="min-h-0 overflow-y-auto overflow-x-hidden {COLUMN_SCROLL_MAX_CLASS} px-2 py-2"
							data-testid="case-overview-assets-vehicles-scroll"
						>
							{#if buckets.vehicles.length === 0}
								<p class="{DS_EMPTY_CLASSES.description} m-0 text-sm">No vehicles recorded yet.</p>
							{:else}
								<ul class="m-0 flex list-none flex-col gap-1.5 p-0" aria-label="Vehicles">
									{#each vehiclesShown as ent (ent.id)}
										<li>
											<a
												href={`/case/${caseId}/entities/${encodeURIComponent(ent.id)}`}
												class="block rounded-md border border-transparent px-1.5 py-1.5 text-sm leading-snug text-[color:var(--ce-l-text-primary)] transition hover:border-[color:var(--ce-l-border-subtle)] hover:bg-[color:var(--ce-l-surface-muted)]"
												data-testid="case-overview-assets-vehicles-row"
											>
												{ent.display_label?.trim() || 'Vehicle'}
											</a>
										</li>
									{/each}
								</ul>
								{#if vehiclesHasMore}
									<div class="mt-2 border-t border-[color:var(--ce-l-border-subtle)] pt-2">
										<button
											type="button"
											class="{DS_BTN_CLASSES.secondary} w-full"
											data-testid="case-overview-assets-vehicles-load-more"
											on:click={() =>
												(nVehicles = Math.min(nVehicles + PAGE_SIZE, buckets.vehicles.length))}
										>
											{P129_ACTIVITY_LIST_LOAD_MORE}
										</button>
									</div>
								{/if}
							{/if}
						</div>
					</div>
				</div>

				<!-- Phones -->
				<div class="flex min-h-0 min-w-0 flex-col gap-2" data-testid="case-overview-assets-col-phones">
					<h3 class="{DS_TYPE_CLASSES.meta} m-0 font-semibold uppercase tracking-wide text-[color:var(--ce-l-text-muted)]">
						Phone numbers
					</h3>
					<div
						class="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface)]"
					>
						<div
							class="min-h-0 overflow-y-auto overflow-x-hidden {COLUMN_SCROLL_MAX_CLASS} px-2 py-2"
							data-testid="case-overview-assets-phones-scroll"
						>
							{#if buckets.phones.length === 0}
								<p class="{DS_EMPTY_CLASSES.description} m-0 text-sm">No phone numbers recorded yet.</p>
							{:else}
								<ul class="m-0 flex list-none flex-col gap-1.5 p-0" aria-label="Phone numbers">
									{#each phonesShown as ent (ent.id)}
										<li>
											<a
												href={`/case/${caseId}/entities/${encodeURIComponent(ent.id)}`}
												class="block rounded-md border border-transparent px-1.5 py-1.5 font-mono text-sm leading-snug text-[color:var(--ce-l-text-primary)] transition hover:border-[color:var(--ce-l-border-subtle)] hover:bg-[color:var(--ce-l-surface-muted)]"
												data-testid="case-overview-assets-phones-row"
											>
												{ent.display_label?.trim() || 'Phone'}
											</a>
										</li>
									{/each}
								</ul>
								{#if phonesHasMore}
									<div class="mt-2 border-t border-[color:var(--ce-l-border-subtle)] pt-2">
										<button
											type="button"
											class="{DS_BTN_CLASSES.secondary} w-full"
											data-testid="case-overview-assets-phones-load-more"
											on:click={() => (nPhones = Math.min(nPhones + PAGE_SIZE, buckets.phones.length))}
										>
											{P129_ACTIVITY_LIST_LOAD_MORE}
										</button>
									</div>
								{/if}
							{/if}
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</section>
