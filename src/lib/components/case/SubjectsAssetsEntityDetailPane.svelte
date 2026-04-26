<script lang="ts">
	/**
	 * Right column — compact subject summary (Files preview-pane pattern). Full edit stays in the modal.
	 * P132 — VEHICLE/LOCATION use the same pretab frame + side cards as focus detail (denser scale).
	 */
	import type { CaseIntelligenceCommittedEntity } from '$lib/apis/caseEngine';
	import {
		DS_BTN_CLASSES,
		DS_ENTITY_DETAIL_CLASSES,
		DS_INTELLIGENCE_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import { MapPinIcon, TruckIcon } from 'heroicons-svelte/24/outline';
	import {
		buildRegistrySecondaryLine,
		entityPortraitUrl,
		initialsFromDisplayLabel
	} from '$lib/utils/caseIntelligenceEntityRegistry';
	import { coreAttributesEntries } from '$lib/utils/caseIntelligenceEntityDetailDisplay';

	export let entity: CaseIntelligenceCommittedEntity;
	export let onClose: () => void;
	export let onOpenFullDetail: () => void;

	let portraitFailed = false;

	$: secondary = buildRegistrySecondaryLine(entity.entity_kind, entity);
	$: portraitUrl =
		entity.entity_kind === 'PERSON' ? entityPortraitUrl(entity.core_attributes ?? {}) : null;
	$: initials = initialsFromDisplayLabel(entity.display_label);
	$: allAttrRows = coreAttributesEntries(entity.core_attributes ?? {});
	$: attrRows = allAttrRows.slice(0, 8);
	$: vlPaneLeft = allAttrRows.slice(0, 4);
	$: vlPaneRight = allAttrRows.slice(4, 8);
	$: isVehicleOrLocation = entity.entity_kind === 'VEHICLE' || entity.entity_kind === 'LOCATION';
</script>

<aside
	class="hidden min-h-0 max-h-full h-full w-[min(100%,26rem)] shrink-0 flex-col self-stretch border-l border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-raised)] lg:flex"
	data-testid="subjects-assets-entity-detail-pane"
	aria-label="Subject detail"
>
	<div
		class="flex shrink-0 items-center justify-between gap-2 border-b border-[color:var(--ce-l-border-subtle)] px-3 py-2.5"
	>
		<p class="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--ce-l-text-muted)]">
			Subject detail
		</p>
		<div class="flex items-center gap-1">
			<button
				type="button"
				class="{DS_BTN_CLASSES.secondary} px-2.5 py-1.5 text-xs"
				data-testid="subjects-assets-pane-open-full"
				on:click={onOpenFullDetail}
			>
				Full detail
			</button>
			<button
				type="button"
				class="{DS_BTN_CLASSES.ghost} min-h-0 rounded p-1.5"
				aria-label="Close detail"
				data-testid="subjects-assets-pane-close"
				on:click={onClose}
			>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="size-5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
	</div>

	<div class="min-h-0 flex-1 overflow-y-auto px-3 py-3">
		{#if isVehicleOrLocation}
			<div class="flex gap-2.5" data-testid="subjects-assets-pane-vl-hero">
				<div
					class="{DS_ENTITY_DETAIL_CLASSES.personPretabPortraitCard} w-[4.25rem] max-w-[36%] shrink-0"
				>
					{#if entity.entity_kind === 'VEHICLE'}
						<TruckIcon class="h-8 w-8 text-amber-400" aria-hidden="true" />
					{:else}
						<MapPinIcon class="h-8 w-8 text-emerald-400" aria-hidden="true" />
					{/if}
				</div>
				<div class="min-w-0 flex-1">
					<p class="m-0 text-sm font-semibold leading-snug text-[color:var(--ce-l-text-primary)]">
						{entity.display_label}
					</p>
					<p class="mt-0.5 text-[11px] uppercase tracking-wide text-[color:var(--ce-l-text-muted)]">
						{entity.entity_kind === 'VEHICLE' ? 'Vehicle' : 'Location'}
					</p>
					{#if secondary}
						<p class="mt-1 text-xs {DS_TYPE_CLASSES.meta}">{secondary}</p>
					{/if}
				</div>
			</div>
			<div class="mt-3 space-y-2.5" data-testid="subjects-assets-pane-vl-cards">
				{#if vlPaneLeft.length > 0}
					<section
						class="{DS_INTELLIGENCE_CLASSES.panel} {DS_ENTITY_DETAIL_CLASSES.personPretabSummaryCard} !p-2.5"
					>
						<h3 class="{DS_ENTITY_DETAIL_CLASSES.sectionLabel} !text-[10px]">
							{entity.entity_kind === 'VEHICLE' ? 'Registration' : 'Place & address'}
						</h3>
						<dl class="{DS_ENTITY_DETAIL_CLASSES.attrGrid} mt-1.5 !gap-1.5">
							{#each vlPaneLeft as row (row.key)}
								<div class="{DS_ENTITY_DETAIL_CLASSES.attrCell}">
									<dt class="{DS_ENTITY_DETAIL_CLASSES.attrDt} !text-[10px]">{row.label}</dt>
									<dd class="{DS_ENTITY_DETAIL_CLASSES.attrDd} !text-xs">{row.value}</dd>
								</div>
							{/each}
						</dl>
					</section>
				{/if}
				{#if vlPaneRight.length > 0}
					<section
						class="{DS_INTELLIGENCE_CLASSES.panel} {DS_ENTITY_DETAIL_CLASSES.personPretabSummaryCard} {DS_ENTITY_DETAIL_CLASSES.personHeaderRecordCard} !p-2.5"
					>
						<h3 class="{DS_ENTITY_DETAIL_CLASSES.sectionLabel} !text-[10px]">More</h3>
						<dl class="{DS_ENTITY_DETAIL_CLASSES.attrGrid} mt-1.5 !gap-1.5">
							{#each vlPaneRight as row (row.key)}
								<div class="{DS_ENTITY_DETAIL_CLASSES.attrCell}">
									<dt class="{DS_ENTITY_DETAIL_CLASSES.attrDt} !text-[10px]">{row.label}</dt>
									<dd class="{DS_ENTITY_DETAIL_CLASSES.attrDd} !text-xs">{row.value}</dd>
								</div>
							{/each}
						</dl>
					</section>
				{/if}
			</div>
		{:else}
			<div class="flex gap-3">
				{#if portraitUrl && !portraitFailed}
					<img
						src={portraitUrl}
						alt=""
						class="h-16 w-16 shrink-0 rounded-full border border-[color:var(--ce-l-border-subtle)] object-cover"
						on:error={() => (portraitFailed = true)}
					/>
				{:else}
					<div
						class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-elevated)] text-sm font-semibold text-[color:var(--ce-l-text-secondary)]"
						aria-hidden="true"
					>
						{initials}
					</div>
				{/if}
				<div class="min-w-0 flex-1">
					<p class="m-0 text-sm font-semibold leading-snug text-[color:var(--ce-l-text-primary)]">
						{entity.display_label}
					</p>
					<p class="mt-0.5 text-[11px] uppercase tracking-wide text-[color:var(--ce-l-text-muted)]">
						{entity.entity_kind.replace('_', ' ')}
					</p>
					{#if secondary}
						<p class="mt-1 text-xs {DS_TYPE_CLASSES.meta}">{secondary}</p>
					{/if}
				</div>
			</div>

			{#if attrRows.length > 0}
				<dl class="mt-4 space-y-2 border-t border-[color:var(--ce-l-border-subtle)] pt-3">
					{#each attrRows as row (row.key)}
						<div class="grid grid-cols-[minmax(0,7rem)_1fr] gap-x-2 text-xs">
							<dt class="font-medium text-[color:var(--ce-l-text-muted)]">{row.label}</dt>
							<dd class="break-words text-[color:var(--ce-l-text-secondary)]">{row.value}</dd>
						</div>
					{/each}
				</dl>
			{/if}
		{/if}
	</div>
</aside>
