<script lang="ts">
	/**
	 * P75-06 — Operator Command Center outer frame: summary band, main column (slot), right rail.
	 * P75-07 — `summary` and `rail` slots; parent supplies module regions (honest data / placeholders).
	 */
	import { getContext } from 'svelte';

	import {
		DS_TYPE_CLASSES,
		DS_PANEL_CLASSES,
		DS_EMPTY_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';

	const i18n = getContext('i18n');

	$: fallbackNote = $i18n.t('Module wiring lands in a later release — structure only.');
</script>

<div class="ds-occ-root ds-surface" data-region="occ-root" data-testid="occ-root">
	<section
		class="ds-occ-summary-band"
		aria-label={$i18n.t('Operational summary band')}
		data-region="occ-summary-band"
		data-testid="occ-summary-band"
	>
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

	<div class="ds-occ-main-grid" data-testid="occ-main-grid">
		<div
			class="min-w-0"
			data-region="occ-main-column"
			data-testid="occ-main-column"
		>
			<slot />
		</div>

		<aside
			class="ds-occ-rail w-full"
			aria-label={$i18n.t('Operational widgets')}
			data-region="occ-right-rail"
			data-testid="occ-right-rail"
		>
			<slot name="rail">
				<div class="{DS_PANEL_CLASSES.muted} ds-panel-dense" data-occ-rail-slot="assistant">
					<div
						class="{DS_TYPE_CLASSES.meta} font-semibold uppercase tracking-wide text-[color:var(--ds-text-muted)]"
					>
						{$i18n.t('AI Assistant — Quick Ask')}
					</div>
					<p class="{DS_EMPTY_CLASSES.description} mt-2 leading-snug">{fallbackNote}</p>
				</div>
			</slot>
		</aside>
	</div>
</div>
