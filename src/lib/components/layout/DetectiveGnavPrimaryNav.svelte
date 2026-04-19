<script lang="ts">
	/**
	 * P75-04 — Core + operational primary app navigation (GNAV).
	 * Ordering: Home → Cases → Search & intel — GLOBAL_NAVIGATION_AND_COMMAND_SPEC.md (DetectiveCaseEngine docs).
	 * P131.8-02 — Tighter outer padding + Operational group spacing; row density in `detectiveSurfaces.css` (`.ds-gnav-*`).
	 * P131.8-07 — Slight nav wrapper + Operational label spacing rebalance (CSS carries link row rhythm).
	 */
	import { page } from '$app/state';
	import { showSearch, governanceNavEligible } from '$lib/stores';
	import { resolveDetectiveGnavPrimaryActive } from '$lib/utils/detectiveGnav';
	import type { DetectiveGnavPrimaryId } from '$lib/utils/detectiveGnav';
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import { getContext } from 'svelte';
	import OccIconHome from '$lib/components/icons/occ/OccIconHome.svelte';
	import OccIconFolder from '$lib/components/icons/occ/OccIconFolder.svelte';
	import OccIconCommandCenter from '$lib/components/icons/occ/OccIconCommandCenter.svelte';
	import OccIconGovernance from '$lib/components/icons/occ/OccIconGovernance.svelte';
	import OccIconSearch from '$lib/components/icons/occ/OccIconSearch.svelte';

	const i18n = getContext('i18n');

	interface Props {
		onItemActivate?: () => void;
	}
	let { onItemActivate = () => {} }: Props = $props();

	/** Svelte 5: `page` must come from `$app/state` + runes — legacy `$:` + `$app/stores` does not update after navigation. */
	const activeId = $derived(resolveDetectiveGnavPrimaryActive(page.url.pathname, $showSearch));

	function linkClass(id: Exclude<DetectiveGnavPrimaryId, null>): string {
		return activeId === id ? 'ds-gnav-link ds-gnav-link--active' : 'ds-gnav-link';
	}
</script>

<div class="flex flex-col gap-2 px-1 pt-1 pb-0.5" data-testid="detective-gnav-primary">
	<div class="ds-gnav-group-label">Core</div>
	<Tooltip
		className="block w-full"
		content={$i18n.t('Operator command center — home workspace')}
		placement="right"
	>
		<a
			href="/home"
			draggable="false"
			class={linkClass('home')}
			data-gnav-id="home"
			aria-current={activeId === 'home' ? 'page' : undefined}
			on:click={onItemActivate}
		>
			<OccIconHome className="ds-gnav-link__icon" />
			<span class="font-primary">{$i18n.t('Home')}</span>
		</a>
	</Tooltip>
	<Tooltip
		className="block w-full"
		content={$i18n.t('Browse and open case investigations')}
		placement="right"
	>
		<a
			href="/cases"
			draggable="false"
			class={linkClass('cases')}
			data-gnav-id="cases"
			aria-current={activeId === 'cases' ? 'page' : undefined}
			on:click={onItemActivate}
		>
			<OccIconFolder className="ds-gnav-link__icon" />
			<span class="font-primary">{$i18n.t('Cases')}</span>
		</a>
	</Tooltip>

	<div class="ds-gnav-group-label">Operational</div>
	<Tooltip
		className="block w-full"
		content={$i18n.t('Cross-case visibility (read-only; Phase 131)')}
		placement="right"
	>
		<a
			href="/command-center"
			draggable="false"
			class={linkClass('command_center')}
			data-gnav-id="command_center"
			data-testid="detective-gnav-command-center"
			aria-current={activeId === 'command_center' ? 'page' : undefined}
			on:click={onItemActivate}
		>
			<OccIconCommandCenter className="ds-gnav-link__icon" />
			<span class="font-primary">Command Center</span>
		</a>
	</Tooltip>
	{#if $governanceNavEligible === true}
		<Tooltip
			className="block w-full"
			content={$i18n.t('Read-only access configuration visibility (Phase 132)')}
			placement="right"
		>
			<a
				href="/governance"
				draggable="false"
				class={linkClass('governance')}
				data-gnav-id="governance"
				data-testid="detective-gnav-governance"
				aria-current={activeId === 'governance' ? 'page' : undefined}
				on:click={onItemActivate}
			>
				<OccIconGovernance className="ds-gnav-link__icon" />
				<span class="font-primary">Governance</span>
			</a>
		</Tooltip>
	{/if}
	<Tooltip
		className="block w-full"
		content={$i18n.t('Global search and intel (cross-case where permitted)')}
		placement="right"
	>
		<button
			type="button"
			class={linkClass('search')}
			data-gnav-id="search"
			aria-pressed={activeId === 'search' ? 'true' : 'false'}
			on:click={() => {
				showSearch.set(true);
				onItemActivate();
			}}
		>
			<OccIconSearch className="ds-gnav-link__icon" />
			<span class="font-primary">{$i18n.t('Search & Intel')}</span>
		</button>
	</Tooltip>
</div>
