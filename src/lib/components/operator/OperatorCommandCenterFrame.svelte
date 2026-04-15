<script lang="ts">
	/**
	 * P75-06 — Operator Command Center outer frame: summary band, main column, right rail.
	 * P75-07 — `summary` and `rail` slots; parent supplies module regions (honest data / placeholders).
	 * P131.6-01 — Dashboard shell: hero → summary row → 3-column grid (layout/composition only).
	 * P131.6-04 — Landmarks: `<main>`, `<header>`, labeled `<section>` columns + summary.
	 * P131.9-01 — Unified dashboard surface wraps hero + KPI + board; hero is de-framed inside it.
	 * P131.9-05B — Desktop (≥1200px): bottom six in `ds-occ-dashboard-board` 3×2 grid; `<1200px` keeps 3-column stack.
	 * Breakpoint state is owned by `/home` +page (matchMedia) — frame stays free of lifecycle hooks.
	 */
	import { getContext } from 'svelte';

	import {
		DS_OCC_CLASSES,
		DS_TYPE_CLASSES,
		DS_PANEL_CLASSES,
		DS_EMPTY_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';

	const i18n = getContext('i18n');

	$: fallbackNote = $i18n.t('Module wiring lands in a later release — structure only.');

	/** Set by parent from `matchMedia('(min-width: 1200px)')` (client); SSR/false → stacked columns. */
	export let occDesktopBoard = false;
</script>

<main
	class="ds-occ-root ds-surface"
	id="occ-command-center-main"
	aria-labelledby="occ-home-hero-heading"
	data-region="occ-root"
	data-testid="occ-root"
>
	<div
		class={DS_OCC_CLASSES.dashboardSurface}
		data-region="occ-dashboard-surface"
		data-testid="occ-dashboard-surface"
	>
		<header
			class="ds-occ-hero-band"
			data-region="occ-hero-band"
			data-testid="occ-hero-band"
		>
			<slot name="hero">
				<div class="ds-occ-hero-band__inner">
					<p class="{DS_TYPE_CLASSES.meta} text-[color:var(--ds-text-muted)]">{fallbackNote}</p>
				</div>
			</slot>
		</header>

		<section
			class="ds-occ-summary-band"
			aria-labelledby="occ-dashboard-summary-heading"
			data-region="occ-summary-band"
			data-testid="occ-summary-band"
		>
			<h2 id="occ-dashboard-summary-heading" class="sr-only">
				{$i18n.t('Summary metrics')}
			</h2>
			<slot name="summary">
				<div
					class="ds-occ-summary-slot {DS_PANEL_CLASSES.muted} ds-panel-dense"
					data-occ-slot="assigned"
				>
					<div
						class="{DS_TYPE_CLASSES.meta} font-semibold uppercase tracking-wide text-[color:var(--ds-text-muted)]"
					>
						{$i18n.t('Active assigned cases')}
					</div>
					<p class="{DS_EMPTY_CLASSES.description} mt-1 leading-snug">{fallbackNote}</p>
				</div>
			</slot>
		</section>

		{#if occDesktopBoard}
			<div
				class={DS_OCC_CLASSES.dashboardBoard}
				data-region="occ-dashboard-board"
				data-testid="occ-dashboard-board"
			>
				<slot name="boardCases" />
				<slot name="boardActivity" />
				<slot name="boardAssistant" />
				<slot name="boardWorkflow" />
				<slot name="boardIntel" />
				<slot name="boardProposals" />
			</div>
		{:else}
			<div class="ds-occ-dashboard-grid" data-region="occ-dashboard-grid" data-testid="occ-dashboard-grid">
				<section
					class="ds-occ-dashboard-col"
					aria-labelledby="occ-col-left-heading"
					data-region="occ-dashboard-left"
					data-testid="occ-dashboard-left"
				>
					<h2 id="occ-col-left-heading" class="sr-only">
						{$i18n.t('Dashboard — left column')}
					</h2>
					<slot name="colLeft">
						<div class="{DS_PANEL_CLASSES.muted} ds-panel-dense" data-occ-dashboard-fallback="left">
							<p class="{DS_EMPTY_CLASSES.description}">{fallbackNote}</p>
						</div>
					</slot>
				</section>
				<section
					class="ds-occ-dashboard-col"
					aria-labelledby="occ-col-center-heading"
					data-region="occ-dashboard-center"
					data-testid="occ-dashboard-center"
				>
					<h2 id="occ-col-center-heading" class="sr-only">
						{$i18n.t('Dashboard — center column')}
					</h2>
					<slot name="colCenter">
						<div class="{DS_PANEL_CLASSES.muted} ds-panel-dense" data-occ-dashboard-fallback="center">
							<p class="{DS_EMPTY_CLASSES.description}">{fallbackNote}</p>
						</div>
					</slot>
				</section>
				<section
					class="ds-occ-dashboard-col"
					aria-labelledby="occ-col-right-heading"
					data-region="occ-dashboard-right"
					data-testid="occ-dashboard-right"
				>
					<h2 id="occ-col-right-heading" class="sr-only">
						{$i18n.t('Dashboard — right column')}
					</h2>
					<slot name="colRight">
						<div class="{DS_PANEL_CLASSES.muted} ds-panel-dense" data-occ-dashboard-fallback="right">
							<p class="{DS_EMPTY_CLASSES.description}">{fallbackNote}</p>
						</div>
					</slot>
				</section>
			</div>
		{/if}
	</div>
</main>
