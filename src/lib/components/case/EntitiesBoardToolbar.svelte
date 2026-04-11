<script lang="ts">
	/**
	 * P69-07 — Overview board top toolbar (P69-04 §1.3): workspace label, case chip, refresh-all, add menu, shortcuts.
	 */
	import type { CaseIntelligenceEntityKind } from '$lib/apis/caseEngine';
	import { DS_ENTITY_BOARD_CLASSES } from '$lib/case/detectivePrimitiveFoundation';

	export let caseId: string;
	export let caseTitle: string;
	/** e.g. case number */
	export let caseNumber: string;
	export let onRefreshAll: (() => void) | undefined = undefined;
	export let onAddPerson: (() => void) | undefined = undefined;
	export let onAddVehicle: (() => void) | undefined = undefined;
	export let onAddLocation: (() => void) | undefined = undefined;
	export let addMenuDisabled = false;
	/** Intake strip control (P69-04 R4) */
	export let intakeExpanded = false;
	export let onToggleIntake: (() => void) | undefined = undefined;

	let addMenuOpen = false;

	function closeAddMenu(): void {
		addMenuOpen = false;
	}

	function pickAdd(kind: CaseIntelligenceEntityKind): void {
		addMenuOpen = false;
		if (kind === 'PERSON') onAddPerson?.();
		else if (kind === 'VEHICLE') onAddVehicle?.();
		else onAddLocation?.();
	}
</script>

<div class="{DS_ENTITY_BOARD_CLASSES.toolbar} entities-board-toolbar" data-testid="entities-board-toolbar">
	<div class="{DS_ENTITY_BOARD_CLASSES.toolbarRow}">
		<div class="min-w-0 flex-1 space-y-2">
			<div class="{DS_ENTITY_BOARD_CLASSES.toolbarTitleRow}">
				<h1 class="{DS_ENTITY_BOARD_CLASSES.toolbarTitle}">Entities</h1>
				<span class="{DS_ENTITY_BOARD_CLASSES.toolbarBadge}"> Overview board </span>
			</div>
			<p class="{DS_ENTITY_BOARD_CLASSES.toolbarSubtitle}">Case roster &amp; entity intelligence</p>
			<p class="{DS_ENTITY_BOARD_CLASSES.toolbarCaseLine}" title={caseTitle || caseNumber}>
				{#if caseNumber}
					<span class="ds-type-mono">{caseNumber}</span>
				{/if}
				{#if caseTitle}
					<span> · {caseTitle}</span>
				{/if}
			</p>
		</div>

		<div class="{DS_ENTITY_BOARD_CLASSES.toolbarActions}">
			<a
				href="/case/{caseId}/timeline"
				class="{DS_ENTITY_BOARD_CLASSES.toolbarLink}"
				data-testid="entities-board-link-timeline"
			>
				Timeline
			</a>
			<a
				href="/case/{caseId}/proposals"
				class="{DS_ENTITY_BOARD_CLASSES.toolbarLink}"
				data-testid="entities-board-link-proposals"
			>
				Proposals
			</a>

			<button
				type="button"
				class="{DS_ENTITY_BOARD_CLASSES.toolbarGhostBtn}"
				data-testid="entities-board-refresh-all"
				on:click={() => onRefreshAll?.()}
			>
				Refresh all
			</button>

			<div class="relative">
				<button
					type="button"
					class="{DS_ENTITY_BOARD_CLASSES.toolbarPrimaryBtn}"
					data-testid="entities-board-add-entity"
					disabled={addMenuDisabled}
					aria-expanded={addMenuOpen}
					on:click={() => (addMenuOpen = !addMenuOpen)}
				>
					Add entity ▾
				</button>
				{#if addMenuOpen}
					<div class="{DS_ENTITY_BOARD_CLASSES.toolbarMenu}" role="menu" data-testid="entities-board-add-menu">
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
					<button
						type="button"
						class="{DS_ENTITY_BOARD_CLASSES.toolbarMenuBackdrop}"
						aria-label="Close menu"
						on:click={closeAddMenu}
					></button>
				{/if}
			</div>

			<button
				type="button"
				class="{DS_ENTITY_BOARD_CLASSES.toolbarIntakeToggle}"
				data-testid="entities-board-toggle-intake"
				aria-expanded={intakeExpanded}
				on:click={() => onToggleIntake?.()}
			>
				{intakeExpanded ? 'Hide intake' : 'Intake / staging'}
			</button>
		</div>
	</div>
</div>
