<script lang="ts">
	/**
	 * P75-06 — Operator Command Center outer frame: summary band, main column, right rail.
	 * P75-07 — `summary` and `rail` slots; parent supplies module regions (honest data / placeholders).
	 * P131.6-01 — Dashboard shell: hero → summary row → 3-column grid (layout/composition only).
	 * P131.6-04 — Landmarks: `<main>`, `<header>`, labeled `<section>` columns + summary.
	 * P131.9-01 — Unified dashboard surface wraps hero + KPI + board; hero is de-framed inside it.
	 * P131.9-18 — Optional `heroBanner` slot: full-bleed top strip inside the OCC sheet (stack + overlay title in `/home`).
	 * Optional `afterColumns` slot: full-width stacked modules below the hero/summary/grid (`/case/:id/summary`).
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

	/** Optional landmark id for the hero `h1` when reusing this frame outside `/home` (defaults to Home). */
	export let heroHeadingId = 'occ-home-hero-heading';

	/**
	 * `cases` — two columns only: browse (case list) + details rail; filters live in the page popover, not here.
	 * `default` — Home / generic three-column ratio.
	 */
	export let dashboardGridVariant: 'default' | 'cases' = 'default';

	/** Omit the hero band entirely (e.g. `/case/:id/summary` where shell header carries title context). */
	export let showHeroBand = true;

	/** Appended to `<main>` (e.g. `flex-1 min-h-0` when nested in a Tier-L scroll shell). */
	export let occRootExtraClass = '';

	/** `id` on `<main>` — override when reusing the frame under another landmark to keep ids unique. */
	export let mainId = 'occ-command-center-main';

	/**
	 * When `showHeroBand` is false, `aria-labelledby` is omitted; set this for `aria-label` on `<main>`.
	 */
	export let mainAriaLabel: string | undefined = undefined;

	/** Appended to the dashboard surface wrapper (e.g. overflow when the page adds `afterColumns` body content). */
	export let dashboardSurfaceExtraClass = '';
</script>

<main
	class="ds-occ-root ds-surface {occRootExtraClass}"
	id={mainId}
	aria-labelledby={showHeroBand ? heroHeadingId : undefined}
	aria-label={!showHeroBand ? mainAriaLabel ?? undefined : undefined}
	data-region="occ-root"
	data-testid="occ-root"
>
	<div
		class="{DS_OCC_CLASSES.dashboardSurface} {dashboardSurfaceExtraClass}"
		data-region="occ-dashboard-surface"
		data-testid="occ-dashboard-surface"
	>
		{#if showHeroBand}
			<header
				class="ds-occ-hero-band"
				data-region="occ-hero-band"
				data-testid="occ-hero-band"
			>
				{#if $$slots.heroBanner}
					<div
						class="ds-occ-dashboard-hero-banner"
						data-region="occ-hero-banner"
						data-testid="occ-hero-banner"
					>
						<slot name="heroBanner" />
					</div>
				{/if}
				<slot name="hero">
					<div class="ds-occ-hero-band__inner">
						<p class="{DS_TYPE_CLASSES.meta} text-[color:var(--ds-text-muted)]">{fallbackNote}</p>
					</div>
				</slot>
			</header>
		{/if}

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
			<div
				class="ds-occ-dashboard-grid {dashboardGridVariant === 'cases' ? 'ds-occ-dashboard-grid--cases' : ''}"
				data-region="occ-dashboard-grid"
				data-testid="occ-dashboard-grid"
				data-occ-dashboard-variant={dashboardGridVariant}
			>
				{#if dashboardGridVariant !== 'cases'}
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
				{/if}
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

		{#if $$slots.afterColumns}
			<div
				class="ds-occ-dashboard-after-columns flex min-w-0 flex-col gap-6"
				data-region="occ-dashboard-after-columns"
				data-testid="occ-dashboard-after-columns"
			>
				<slot name="afterColumns" />
			</div>
		{/if}
	</div>
</main>
