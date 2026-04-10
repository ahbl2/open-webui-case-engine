<script lang="ts">
	/**
	 * P69-07 — Overview board top toolbar (P69-04 §1.3): workspace label, case chip, refresh-all, add menu, shortcuts.
	 */
	import type { CaseIntelligenceEntityKind } from '$lib/apis/caseEngine';

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

<div
	class="entities-board-toolbar sticky top-0 z-20 mb-10 px-4 md:px-6 pt-6 pb-6 md:pt-8 md:pb-7
	       rounded-b-2xl border-b border-slate-700/45 bg-gradient-to-b from-slate-950/98 via-slate-950/92 to-slate-950/75 backdrop-blur-xl shadow-[0_12px_40px_-18px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(255,255,255,0.04)] ring-1 ring-white/[0.04]"
	data-testid="entities-board-toolbar"
>
	<div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
	<div class="min-w-0 flex-1 space-y-2">
		<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
			<h1 class="text-2xl md:text-3xl font-bold text-slate-50 tracking-tight">Entities</h1>
			<span
				class="text-[10px] font-semibold uppercase tracking-widest text-cyan-400/90 hidden sm:inline px-2.5 py-0.5 rounded-full bg-cyan-950/50 border border-cyan-500/25"
			>
				Overview board
			</span>
		</div>
		<p class="text-sm text-slate-500 font-medium">Case roster &amp; entity intelligence</p>
		<p class="text-[13px] text-slate-400/95 leading-snug truncate max-w-2xl" title={caseTitle || caseNumber}>
			{#if caseNumber}
				<span class="font-mono text-slate-300">{caseNumber}</span>
			{/if}
			{#if caseTitle}
				<span class="text-slate-500"> · {caseTitle}</span>
			{/if}
		</p>
	</div>

	<div class="flex flex-wrap items-center gap-2.5 justify-start lg:justify-end shrink-0">
		<a
			href="/case/{caseId}/timeline"
			class="text-xs px-3 py-2 rounded-lg border border-slate-600/80 text-slate-200 hover:bg-slate-800/90 hover:border-slate-500 transition-colors shadow-sm"
			data-testid="entities-board-link-timeline"
		>
			Timeline
		</a>
		<a
			href="/case/{caseId}/proposals"
			class="text-xs px-3 py-2 rounded-lg border border-slate-600/80 text-slate-200 hover:bg-slate-800/90 hover:border-slate-500 transition-colors shadow-sm"
			data-testid="entities-board-link-proposals"
		>
			Proposals
		</a>

		<button
			type="button"
			class="text-xs px-3 py-2 rounded-lg border border-slate-600/80 text-slate-200 hover:bg-slate-800/90 transition-colors"
			data-testid="entities-board-refresh-all"
			on:click={() => onRefreshAll?.()}
		>
			Refresh all
		</button>

		<div class="relative">
			<button
				type="button"
				class="text-xs px-4 py-2 rounded-lg font-bold tracking-wide uppercase bg-gradient-to-b from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white shadow-[0_4px_18px_-6px_rgba(34,211,238,0.55)] disabled:opacity-50 border border-cyan-400/40"
				data-testid="entities-board-add-entity"
				disabled={addMenuDisabled}
				aria-expanded={addMenuOpen}
				on:click={() => (addMenuOpen = !addMenuOpen)}
			>
				Add entity ▾
			</button>
			{#if addMenuOpen}
				<div
					class="absolute right-0 mt-2 w-48 rounded-xl border border-slate-600/80 bg-slate-950/98 backdrop-blur-md shadow-2xl z-30 py-1.5 ring-1 ring-white/5"
					role="menu"
					data-testid="entities-board-add-menu"
				>
					<button
						type="button"
						class="w-full text-left px-3 py-2.5 text-xs font-medium text-slate-200 hover:bg-slate-800/90 rounded-lg mx-1"
						role="menuitem"
						on:click={() => pickAdd('PERSON')}
					>
						Person
					</button>
					<button
						type="button"
						class="w-full text-left px-3 py-2.5 text-xs font-medium text-slate-200 hover:bg-slate-800/90 rounded-lg mx-1"
						role="menuitem"
						on:click={() => pickAdd('VEHICLE')}
					>
						Vehicle
					</button>
					<button
						type="button"
						class="w-full text-left px-3 py-2.5 text-xs font-medium text-slate-200 hover:bg-slate-800/90 rounded-lg mx-1"
						role="menuitem"
						on:click={() => pickAdd('LOCATION')}
					>
						Location
					</button>
				</div>
				<button
					type="button"
					class="fixed inset-0 z-20 cursor-default bg-transparent"
					aria-label="Close menu"
					on:click={closeAddMenu}
				></button>
			{/if}
		</div>

		<button
			type="button"
			class="text-xs px-3 py-2 rounded-lg border border-dashed border-violet-500/40 text-violet-100/95 bg-violet-950/25 hover:bg-violet-950/45 transition-colors"
			data-testid="entities-board-toggle-intake"
			aria-expanded={intakeExpanded}
			on:click={() => onToggleIntake?.()}
		>
			{intakeExpanded ? 'Hide intake' : 'Intake / staging'}
		</button>
	</div>
	</div>
</div>
