<script lang="ts">
	/**
	 * Left rail — registry counts by kind (mockup-aligned summary).
	 * Refreshes when `refreshEpoch` bumps (e.g. after create/delete).
	 * Add entity control lives on the Registry title row (compact for narrow rail).
	 */
	import { browser } from '$app/environment';
	import { listCaseIntelligenceCommittedEntities, type CaseIntelligenceEntityKind } from '$lib/apis/caseEngine';
	import { DS_ENTITY_BOARD_CLASSES, DS_TYPE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import { PlusIcon, UserIcon, MapPinIcon, TruckIcon, DevicePhoneMobileIcon } from 'heroicons-svelte/24/outline';
	import { onMount, tick } from 'svelte';
	import type { Action } from 'svelte/action';

	export let caseId: string;
	export let token: string;
	export let refreshEpoch = 0;
	export let addMenuDisabled = false;
	export let onAddPerson: (() => void) | undefined = undefined;
	export let onAddVehicle: (() => void) | undefined = undefined;
	export let onAddLocation: (() => void) | undefined = undefined;

	let addMenuOpen = false;
	/** For fixed portal menu: anchor to the Add control (getBoundingClientRect). */
	let addButtonEl: HTMLButtonElement | null = null;
	let menuPos = { top: 0, right: 0 };

	const bodyPortal: Action<HTMLDivElement> = (node) => {
		document.body.appendChild(node);
		return {
			destroy() {
				node.remove();
			}
		};
	};

	function updateMenuPosition(): void {
		if (!browser || !addButtonEl || !addMenuOpen) return;
		const r = addButtonEl.getBoundingClientRect();
		/* 4px ≈ one step below the control; right aligns with the Add control’s right edge. */
		menuPos = { top: r.bottom + 4, right: Math.max(0, window.innerWidth - r.right) };
	}

	function closeAddMenu(): void {
		addMenuOpen = false;
	}

	function pickAdd(kind: CaseIntelligenceEntityKind): void {
		addMenuOpen = false;
		if (kind === 'PERSON') onAddPerson?.();
		else if (kind === 'VEHICLE') onAddVehicle?.();
		else if (kind === 'LOCATION') onAddLocation?.();
	}

	function onGlobalKeydown(e: KeyboardEvent): void {
		if (!addMenuOpen || e.key !== 'Escape') return;
		e.preventDefault();
		closeAddMenu();
	}

	$: if (addMenuOpen && browser) {
		void tick().then(() => {
			updateMenuPosition();
			requestAnimationFrame(() => {
				updateMenuPosition();
			});
		});
	}

	onMount(() => {
		if (!browser) return;
		const o = { capture: true } as const;
		const onScrollOrResize = () => {
			if (addMenuOpen) updateMenuPosition();
		};
		document.addEventListener('scroll', onScrollOrResize, o);
		window.addEventListener('resize', onScrollOrResize);
		return () => {
			document.removeEventListener('scroll', onScrollOrResize, o);
			window.removeEventListener('resize', onScrollOrResize);
		};
	});

	let loading = true;
	let loadError = '';
	let counts: Record<'PERSON' | 'VEHICLE' | 'LOCATION' | 'PHONE', number> = {
		PERSON: 0,
		VEHICLE: 0,
		LOCATION: 0,
		PHONE: 0
	};

	const kinds: Array<{ kind: keyof typeof counts; label: string }> = [
		{ kind: 'PERSON', label: 'People' },
		{ kind: 'VEHICLE', label: 'Vehicles' },
		{ kind: 'LOCATION', label: 'Locations' },
		{ kind: 'PHONE', label: 'Phones' }
	];

	let prevCaseId = '';
	let lastEpoch = -1;
	/** After first successful counts for the current case, only refresh in the background (no “Loading…” swap). */
	let countsReady = false;

	async function loadCounts(opts: { silent?: boolean } = {}): Promise<void> {
		if (!caseId || !token) {
			loading = false;
			return;
		}
		const silent = opts.silent === true;
		if (!silent) loading = true;
		loadError = '';
		try {
			/* Engine list API accepts PERSON | VEHICLE | LOCATION only — PHONE would 400. */
			const requestKinds: CaseIntelligenceEntityKind[] = ['PERSON', 'VEHICLE', 'LOCATION'];
			const results = await Promise.all(
				requestKinds.map(async (k) => {
					try {
						const r = await listCaseIntelligenceCommittedEntities(caseId, token, {
							entityKind: k,
							includeRetired: false
						});
						return r.committed_entities?.length ?? 0;
					} catch {
						return 0;
					}
				})
			);
			counts = {
				PERSON: results[0] ?? 0,
				VEHICLE: results[1] ?? 0,
				LOCATION: results[2] ?? 0,
				PHONE: 0
			};
		} catch (e) {
			loadError = e instanceof Error ? e.message : 'Could not load counts.';
		} finally {
			if (!silent) loading = false;
			countsReady = true;
		}
	}

	$: if (caseId && token && (caseId !== prevCaseId || refreshEpoch !== lastEpoch)) {
		const isCaseChange = caseId !== prevCaseId;
		if (isCaseChange) {
			countsReady = false;
		}
		prevCaseId = caseId;
		lastEpoch = refreshEpoch;
		const silent = !isCaseChange && countsReady;
		void loadCounts({ silent });
	}
</script>

<div
	class="flex min-h-0 min-w-0 flex-1 flex-col border-b border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-raised)] lg:max-h-full lg:min-h-0 lg:border-b-0 lg:border-r"
	data-testid="subjects-assets-registry-rail"
	aria-label="Registry counts"
>
	<!-- Title + Add: own row; overflow visible so the dropdown is not in the list scrollport (avoids scrollbar wiggle). -->
	<div class="shrink-0 overflow-visible px-3 pt-3 sm:px-4 sm:pt-4">
		<div class="flex min-w-0 items-center justify-between gap-2">
			<p
				class="m-0 min-w-0 truncate text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--ce-l-text-muted)]"
			>
				Registry
			</p>
			<div class="w-[4.5rem] shrink-0 sm:w-auto sm:min-w-[5.25rem]">
				<button
					type="button"
					bind:this={addButtonEl}
					class="inline-flex w-full max-w-full items-center justify-center gap-0.5 rounded-md border border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-elevated)] px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--ce-l-text-primary)] shadow-sm hover:bg-[color:var(--ce-l-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
					data-testid="entities-board-add-entity"
					disabled={addMenuDisabled}
					aria-expanded={addMenuOpen}
					aria-haspopup="menu"
					title="Add person, vehicle, or location"
					on:click|stopPropagation|preventDefault={() => (addMenuOpen = !addMenuOpen)}
				>
					<PlusIcon class="h-3 w-3 shrink-0" aria-hidden="true" />
					<span class="max-w-[4.5rem] truncate sm:max-w-none">Add</span>
					<span class="text-[9px] opacity-80" aria-hidden="true">▾</span>
				</button>
			</div>
		</div>
	</div>
	<!-- List only scrolls; stable gutter avoids horizontal shift when the scrollport updates. -->
	<div
		class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 pt-2 sm:px-4 sm:pb-4 [scrollbar-gutter:stable]"
	>
		{#if loading}
			<p class="m-0 text-xs {DS_TYPE_CLASSES.meta}">Loading…</p>
		{:else if loadError}
			<p class="m-0 text-xs text-red-600 dark:text-red-400">{loadError}</p>
		{:else}
			<ul class="m-0 list-none space-y-1.5 p-0">
				{#each kinds as row (row.kind)}
					<li
						class="flex items-center justify-between gap-2 rounded-md border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-elevated)] px-2.5 py-2"
					>
						<span
							class="flex min-w-0 items-center gap-2 text-xs font-medium text-[color:var(--ce-l-text-secondary)]"
						>
							{#if row.kind === 'PERSON'}
								<UserIcon class="h-4 w-4 shrink-0 text-sky-400" aria-hidden="true" />
							{:else if row.kind === 'VEHICLE'}
								<TruckIcon class="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
							{:else if row.kind === 'LOCATION'}
								<MapPinIcon class="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
							{:else}
								<DevicePhoneMobileIcon class="h-4 w-4 shrink-0 text-violet-400" aria-hidden="true" />
							{/if}
							<span class="truncate">{row.label}</span>
						</span>
						<span
							class="ds-type-mono text-xs font-semibold tabular-nums text-[color:var(--ce-l-text-primary)]"
						>
							{counts[row.kind]}
						</span>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>

<svelte:window on:keydown|capture={onGlobalKeydown} />

{#if addMenuOpen && browser}
	<!-- Portaled to document.body: avoids transformed ancestors breaking position:fixed and any rail relayout. -->
	<div
		use:bodyPortal
		class="pointer-events-none fixed inset-0 z-[5000] isolate"
		aria-hidden="true"
	>
		<button
			type="button"
			class="{DS_ENTITY_BOARD_CLASSES.toolbarMenuBackdrop} pointer-events-auto"
			aria-label="Close menu"
			on:click={closeAddMenu}
		></button>
		<div
			role="menu"
			data-testid="entities-board-add-menu"
			class="{DS_ENTITY_BOARD_CLASSES.toolbarMenu} pointer-events-auto !m-0 !left-auto"
			style:position="fixed"
			style:top="{menuPos.top}px"
			style:right="{menuPos.right}px"
		>
			<button
				type="button"
				class="{DS_ENTITY_BOARD_CLASSES.toolbarMenuItem}"
				role="menuitem"
				on:click={() => pickAdd('PERSON')}
			>
				Person
			</button>
			<button
				type="button"
				class="{DS_ENTITY_BOARD_CLASSES.toolbarMenuItem}"
				role="menuitem"
				on:click={() => pickAdd('VEHICLE')}
			>
				Vehicle
			</button>
			<button
				type="button"
				class="{DS_ENTITY_BOARD_CLASSES.toolbarMenuItem}"
				role="menuitem"
				on:click={() => pickAdd('LOCATION')}
			>
				Location
			</button>
		</div>
	</div>
{/if}
