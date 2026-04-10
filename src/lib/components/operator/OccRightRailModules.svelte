<script lang="ts">
	/**
	 * P75-07 — OCC right rail: assistant entry, intel placeholder, proposal navigation (no fake queues).
	 */
	import { getContext } from 'svelte';

	import {
		DS_TYPE_CLASSES,
		DS_PANEL_CLASSES,
		DS_EMPTY_CLASSES,
		DS_BTN_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';

	const i18n = getContext('i18n');

	export let newChat: () => void;
	export let bindingInProgress: boolean;
	export let hasToken: boolean;
	export let goToCases: () => void;
</script>

<div class="{DS_PANEL_CLASSES.muted} ds-panel-dense" data-occ-rail-slot="assistant" data-testid="occ-rail-assistant">
	<div
		class="{DS_TYPE_CLASSES.meta} font-semibold uppercase tracking-wide text-[color:var(--ds-text-muted)]"
	>
		{$i18n.t('AI Assistant — Quick Ask')}
	</div>
	<p class="{DS_TYPE_CLASSES.body} text-[color:var(--ds-text-secondary)] mt-0.5 leading-snug">
		{$i18n.t('Start a personal desktop thread for full chat, or open a case for Ask with case context.')}
	</p>
	<button
		type="button"
		class="{DS_BTN_CLASSES.primary} w-full mt-2 justify-center text-sm"
		on:click={newChat}
		disabled={bindingInProgress || !hasToken}
		data-testid="occ-rail-new-chat"
	>
		{bindingInProgress ? $i18n.t('Binding…') : $i18n.t('New desktop chat')}
	</button>
	{#if !hasToken}
		<p class="{DS_EMPTY_CLASSES.description} mt-2">{ $i18n.t('Case Engine session required.') }</p>
	{/if}
</div>

<div class="{DS_PANEL_CLASSES.muted} ds-panel-dense" data-occ-rail-slot="intel" data-testid="occ-rail-intel">
	<div
		class="{DS_TYPE_CLASSES.meta} font-semibold uppercase tracking-wide text-[color:var(--ds-text-muted)]"
	>
		{$i18n.t('Intelligence / alert feed')}
	</div>
	<p class="{DS_EMPTY_CLASSES.description} mt-2 leading-snug">
		{$i18n.t('No workspace intelligence stream is connected in this build. Case-scoped data lives on each case workspace.')}
	</p>
</div>

<div class="{DS_PANEL_CLASSES.muted} ds-panel-dense" data-occ-rail-slot="proposals" data-testid="occ-rail-proposals">
	<div
		class="{DS_TYPE_CLASSES.meta} font-semibold uppercase tracking-wide text-[color:var(--ds-text-muted)]"
	>
		{$i18n.t('Proposal review')}
	</div>
	<p class="{DS_EMPTY_CLASSES.description} mt-2 leading-snug">
		{$i18n.t('Pending proposals are listed per case. Open a case, then use the Proposals tab.')}
	</p>
	<button
		type="button"
		class="{DS_BTN_CLASSES.secondary} w-full mt-2 justify-center text-sm"
		on:click={goToCases}
		data-testid="occ-rail-open-cases"
	>
		{$i18n.t('Open Cases')}
	</button>
</div>
