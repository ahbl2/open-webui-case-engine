<script lang="ts">
	/**
	 * P132 — Shared entity pre-tab header summary (PERSON, VEHICLE, LOCATION, future PHONE).
	 * Theming: `data-entity-kind` + `data-entity-pretab-theme` (see detectiveSurfaces.css).
	 */
	import { MapPinIcon, PhoneIcon, TruckIcon } from 'heroicons-svelte/24/outline';
	import {
		DS_ENTITY_DETAIL_CLASSES,
		DS_INTELLIGENCE_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import type {
		EntityPretabViewModel,
		MediaGridPretabViewModel,
		PretabFieldRow
	} from '$lib/case/entityPretabSummaryViewModel';
	import { isProseCol } from '$lib/case/entityPretabSummaryViewModel';
	import { pretabRiskLevelClasses } from '$lib/case/entityPretabRiskChips';

	export let viewModel: EntityPretabViewModel;
	/** PERSON: contact + investigative cards (parent supplies). */
	export let hasSecondRowSlot = false;
	export let onAssociationsTab: (() => void) | undefined = undefined;

	function mediaRowValueClass(vm: MediaGridPretabViewModel, row: PretabFieldRow): string {
		const base = 'ds-entity-pretab-value';
		if (vm.dataEntityKind === 'VEHICLE' && row.key === 'vin') return `${base} ds-entity-pretab-value--vin`;
		if (vm.dataEntityKind === 'LOCATION' && row.key === 'coordinates') {
			return `${base} ds-entity-pretab-value--coord`;
		}
		return base;
	}
</script>

{#if viewModel.form === 'person'}
	<div
		class="ds-entity-pretab-summary {DS_ENTITY_DETAIL_CLASSES.personPretabSummary}"
		data-entity-kind="PERSON"
		data-entity-pretab-theme="info"
		data-testid="entity-detail-person-pretab-summary"
	>
		<div
			class="ds-entity-pretab-dashboard {DS_ENTITY_DETAIL_CLASSES.personPretabDashboard} {DS_ENTITY_DETAIL_CLASSES.personHeaderLayout}"
			data-entity-kind="PERSON"
			data-entity-pretab-theme="info"
			data-testid={viewModel.dashboardTestid}
		>
			<div
				class="{DS_ENTITY_DETAIL_CLASSES.personPretabCol} {DS_ENTITY_DETAIL_CLASSES
					.personPretabColMedia} ds-entity-pretab-col--media"
				data-testid={viewModel.mediaTestid}
			>
				<div
					class="{DS_ENTITY_DETAIL_CLASSES.personHeaderPhoto} {DS_ENTITY_DETAIL_CLASSES.personPretabPortraitCard}"
				>
					{#if viewModel.portraitUrl}
						<img
							src={viewModel.portraitUrl}
							alt=""
							class="{DS_ENTITY_DETAIL_CLASSES.portrait} {DS_ENTITY_DETAIL_CLASSES.portraitPretabHero}"
							loading="lazy"
							on:error={viewModel.onPortraitError}
						/>
					{:else}
						<span
							class="{DS_ENTITY_DETAIL_CLASSES.portraitFallback} {DS_ENTITY_DETAIL_CLASSES.portraitFallbackPretabHero}"
							aria-hidden="true"
						>
							{viewModel.portraitInitials}
						</span>
					{/if}
				</div>
			</div>
			<div
				class="{DS_ENTITY_DETAIL_CLASSES.personPretabCol} {DS_ENTITY_DETAIL_CLASSES
					.personPretabColIdentity} ds-entity-pretab-col--identity"
			>
				<div class="{DS_ENTITY_DETAIL_CLASSES.personHeaderCenter}">
					<h2 class="{DS_ENTITY_DETAIL_CLASSES.heroTitle}" data-testid="entity-detail-hero-label">
						{viewModel.identity.name}
					</h2>
					<div
						class="{DS_ENTITY_DETAIL_CLASSES.personHeaderIdentityStack}"
						data-testid="entity-detail-metadata-row"
					>
						<div
							class="{DS_ENTITY_DETAIL_CLASSES.personHeaderIdentityRow} {DS_ENTITY_DETAIL_CLASSES
								.personHeaderIdentityDobWithAge}"
							data-testid="entity-detail-person-identity-dob-age"
						>
							<div
								class="{DS_ENTITY_DETAIL_CLASSES.personHeaderIdentityFieldPair}"
								data-testid="entity-detail-person-identity-dob"
							>
								<span class="{DS_ENTITY_DETAIL_CLASSES.personHeaderIdentityLabel}">DOB</span>
								<span class="{DS_ENTITY_DETAIL_CLASSES.personHeaderIdentityValue}">{viewModel.identity.dob}</span>
							</div>
							<div
								class="{DS_ENTITY_DETAIL_CLASSES.personHeaderIdentityFieldPair}"
								data-testid="entity-detail-person-identity-age"
							>
								<span class="{DS_ENTITY_DETAIL_CLASSES.personHeaderIdentityLabel}" title="Age">AGE</span>
								<span
									class="{DS_ENTITY_DETAIL_CLASSES.personHeaderIdentityValue}"
									aria-label="Age in full years from date of birth"
									title="Age in full years, from DOB"
								>
									{viewModel.identity.dobAge}
								</span>
							</div>
						</div>
						<div class="{DS_ENTITY_DETAIL_CLASSES.personHeaderIdentityRow}">
							<span class="{DS_ENTITY_DETAIL_CLASSES.personHeaderIdentityLabel}">SSN</span>
							<span class="{DS_ENTITY_DETAIL_CLASSES.personHeaderIdentityValue}">{viewModel.identity.ssn}</span>
						</div>
						<div class="{DS_ENTITY_DETAIL_CLASSES.personHeaderIdentityRow}">
							<span class="{DS_ENTITY_DETAIL_CLASSES.personHeaderIdentityLabel}">DL</span>
							<span class="{DS_ENTITY_DETAIL_CLASSES.personHeaderIdentityValue}">{viewModel.identity.dl}</span>
						</div>
					</div>
					<div
						class="{DS_ENTITY_DETAIL_CLASSES.personHeaderAlertRow} {DS_ENTITY_DETAIL_CLASSES.personPretabTacticalStrip}"
						data-testid="entity-detail-person-alert-row"
					>
						<span class={viewModel.identity.roleBadgeClass} data-testid="entity-detail-kind-chip">
							{viewModel.identity.roleBadgeText}
						</span>
						{#if viewModel.identity.riskFlagRows.length > 0}
							<div
								class="{DS_ENTITY_DETAIL_CLASSES.personHeaderRiskCluster} flex min-w-0 flex-1 flex-wrap items-center"
							>
								{#each viewModel.identity.riskFlagRows as r (r.id)}
									{@const rl = pretabRiskLevelClasses(r.level)}
									<div class="flex min-w-0 max-w-full items-center gap-1.5">
										<span class={rl.diamond} aria-hidden="true"></span>
										<span class="{DS_TYPE_CLASSES.meta} text-[var(--ds-text-primary)]">{r.label}</span>
										<span class={rl.pill}>{rl.label}</span>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</div>
			<div
				class="{DS_ENTITY_DETAIL_CLASSES.personPretabCol} {DS_ENTITY_DETAIL_CLASSES
					.personPretabColPhysical} ds-entity-pretab-col--field"
				data-testid={viewModel.physical.dataTestid}
			>
				<h3 class="{DS_ENTITY_DETAIL_CLASSES.personPretabSectionTitle}">
					<span class="{DS_ENTITY_DETAIL_CLASSES.personPretabSectionAccent}" aria-hidden="true"></span>
					{viewModel.physical.title}
				</h3>
				<div class="{DS_ENTITY_DETAIL_CLASSES.personPretabRows}">
					{#each viewModel.physical.rows as row (row.key)}
						<div class="{DS_ENTITY_DETAIL_CLASSES.personPretabRow}">
							<span class="{DS_ENTITY_DETAIL_CLASSES.personPretabLabel}">{row.label}</span>
							<span class="{DS_ENTITY_DETAIL_CLASSES.personPretabValue}">{row.value}</span>
						</div>
					{/each}
				</div>
			</div>
			<div
				class="{DS_ENTITY_DETAIL_CLASSES.personPretabCol} {DS_ENTITY_DETAIL_CLASSES
					.personPretabColRecord} ds-entity-pretab-col--field"
				data-testid={viewModel.record.dataTestid}
			>
				<h3 class="{DS_ENTITY_DETAIL_CLASSES.personPretabSectionTitle}">
					<span class="{DS_ENTITY_DETAIL_CLASSES.personPretabSectionAccent}" aria-hidden="true"></span>
					{viewModel.record.title}
				</h3>
				<div class="{DS_ENTITY_DETAIL_CLASSES.personPretabRows}">
					{#each viewModel.record.rows as row (row.key)}
						<div class="{DS_ENTITY_DETAIL_CLASSES.personPretabRow}">
							<span class="{DS_ENTITY_DETAIL_CLASSES.personPretabLabel}">{row.label}</span>
							<span class="{DS_ENTITY_DETAIL_CLASSES.personPretabValue}">{row.value}</span>
						</div>
					{/each}
				</div>
				{#if viewModel.recordListScope}
					<p
						class="{DS_ENTITY_DETAIL_CLASSES.scopeLine} {DS_ENTITY_DETAIL_CLASSES.personPretabRecordScope} mt-2"
					>
						List scope: {viewModel.recordListScope.replace(/_/g, ' ')}
					</p>
				{/if}
			</div>
		</div>
		{#if hasSecondRowSlot}
			<div
				class="ds-entity-pretab-row-2 {DS_ENTITY_DETAIL_CLASSES.personPretabRow2}"
				data-testid="entity-detail-person-pretab-row-2"
			>
				<slot name="secondRow" />
			</div>
		{/if}
	</div>
{:else}
	<div
		class="ds-entity-pretab-summary"
		data-entity-kind={viewModel.dataEntityKind}
		data-entity-pretab-theme={viewModel.dataEntityKind === 'VEHICLE'
			? 'warning'
			: viewModel.dataEntityKind === 'LOCATION'
				? 'teal'
				: 'neutral'}
	>
		<div class="ds-entity-pretab-dashboard" data-entity-kind={viewModel.dataEntityKind} data-testid={viewModel.dashboardTestid}>
			<div class="ds-entity-pretab-col ds-entity-pretab-col--media" data-testid={viewModel.media.mediaTestid}>
				<div class="ds-entity-pretab-media-landscape">
					<div
						class="ds-entity-pretab-aspect"
						data-testid={viewModel.media.iconAspectTestid || undefined}
					>
						{#if viewModel.media.variant === 'landscape_photo' && viewModel.media.photoUrl}
							<img
								src={viewModel.media.photoUrl}
								alt=""
								class="ds-entity-pretab-landscape-photo"
								loading="lazy"
								draggable="false"
								on:error={viewModel.media.onPhotoError}
							/>
						{:else}
							<div class="ds-entity-pretab-fallback" data-testid={viewModel.media.fallbackTestid}>
								{#if viewModel.media.icon === 'truck'}
									<TruckIcon class="h-16 w-16" aria-hidden="true" />
								{:else if viewModel.media.icon === 'mappin'}
									<MapPinIcon class="h-16 w-16" aria-hidden="true" />
								{:else}
									<PhoneIcon class="h-16 w-16" aria-hidden="true" />
								{/if}
							</div>
						{/if}
					</div>
					<span
						class="ds-entity-pretab-kind-badge {DS_ENTITY_DETAIL_CLASSES.roleBadge} {viewModel
							.dataEntityKind === 'PHONE'
							? DS_ENTITY_DETAIL_CLASSES.roleBadgePhone
							: ''}"
						data-testid={viewModel.media.badgeTestid}
					>
						{viewModel.media.badgeText}
					</span>
				</div>
			</div>
			{#each viewModel.columns as col (col.key)}
				{#if isProseCol(col)}
					<div
						class="ds-entity-pretab-col ds-entity-pretab-col--field {col.columnClass ?? ''}"
						data-testid={col.dataTestid}
					>
						<h3 class="ds-entity-pretab-section-title">
							<span class="ds-entity-pretab-section-accent" aria-hidden="true"></span>
							<span>{col.title}</span>
						</h3>
						<div
							class="ds-entity-pretab-notes {col.placeholder
								? 'ds-entity-pretab-notes--placeholder'
								: ''}"
						>
							{col.text}
						</div>
					</div>
				{:else}
					<div
						class="ds-entity-pretab-col ds-entity-pretab-col--field {col.columnClass ?? ''}"
						data-testid={col.dataTestid}
					>
						<h3 class="ds-entity-pretab-section-title">
							<span class="ds-entity-pretab-section-accent" aria-hidden="true"></span>
							<span>{col.title}</span>
						</h3>
						<div class="ds-entity-pretab-rows">
							{#each col.rows as row (row.key)}
								<div class="ds-entity-pretab-row">
									<span class="ds-entity-pretab-label">{row.label}</span>
									<span class={mediaRowValueClass(viewModel, row)}>{row.value}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			{/each}
			{#if viewModel.footLine}
				<p class="ds-entity-pretab-foot {DS_ENTITY_DETAIL_CLASSES.scopeLine}">
					List scope: {viewModel.footLine.replace(/_/g, ' ')}
				</p>
			{/if}
		</div>
		{#if viewModel.phoneSecondRow}
			<div
				class="ds-entity-pretab-row-2 {DS_ENTITY_DETAIL_CLASSES.personPretabRow2}"
				data-testid="entity-detail-phone-pretab-row-2"
			>
				<section
					class="{DS_INTELLIGENCE_CLASSES.panel} {DS_ENTITY_DETAIL_CLASSES.personPretabSummaryCard} min-w-0"
					data-testid="entity-detail-phone-pretab-associated-people"
				>
					<h3 class="{DS_ENTITY_DETAIL_CLASSES.sectionLabel}">Associated people</h3>
					<p class="{DS_TYPE_CLASSES.body} mt-2 text-[var(--ds-text-secondary)]">Not yet wired</p>
					<p class="{DS_TYPE_CLASSES.meta} mt-1">No linked entities</p>
				</section>
				<section
					class="{DS_INTELLIGENCE_CLASSES.panel} {DS_ENTITY_DETAIL_CLASSES.personPretabSummaryCard} min-w-0"
					data-testid="entity-detail-phone-pretab-investigative"
				>
					<div class="flex flex-wrap items-center justify-between gap-2">
						<h3 class="{DS_ENTITY_DETAIL_CLASSES.sectionLabel}">Investigative links</h3>
						<button
							type="button"
							class="{DS_INTELLIGENCE_CLASSES.inlineLink} text-xs font-semibold"
							data-testid="entity-detail-phone-pretab-view-all"
							on:click={() => onAssociationsTab?.()}
						>
							View all
						</button>
					</div>
					<p class="{DS_TYPE_CLASSES.body} mt-2 text-[var(--ds-text-secondary)]">Not yet wired</p>
				</section>
			</div>
		{/if}
	</div>
{/if}
