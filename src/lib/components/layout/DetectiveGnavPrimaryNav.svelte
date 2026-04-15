<script lang="ts">
	/**
	 * P75-04 — Core + operational primary app navigation (GNAV).
	 * Ordering: Home → Cases → Search & intel — GLOBAL_NAVIGATION_AND_COMMAND_SPEC.md (DetectiveCaseEngine docs).
	 * P131.8-02 — Tighter outer padding + Operational group spacing; row density in `detectiveSurfaces.css` (`.ds-gnav-*`).
	 * P131.8-07 — Slight nav wrapper + Operational label spacing rebalance (CSS carries link row rhythm).
	 */
	import { page } from '$app/stores';
	import { showSearch, governanceNavEligible } from '$lib/stores';
	import { resolveDetectiveGnavPrimaryActive } from '$lib/utils/detectiveGnav';
	import type { DetectiveGnavPrimaryId } from '$lib/utils/detectiveGnav';
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import { getContext } from 'svelte';

	const i18n = getContext('i18n');

	export let onItemActivate: () => void = () => {};

	$: activeId = resolveDetectiveGnavPrimaryActive($page.url.pathname, $showSearch);

	function linkClass(id: Exclude<DetectiveGnavPrimaryId, null>): string {
		return activeId === id ? 'ds-gnav-link ds-gnav-link--active' : 'ds-gnav-link';
	}
</script>

<div class="px-1 pt-0.5 pb-0.5" data-testid="detective-gnav-primary">
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
			<svg
				class="ds-gnav-link__icon"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
				aria-hidden="true"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
				/>
			</svg>
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
			<svg
				class="ds-gnav-link__icon"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
				aria-hidden="true"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5m-13.5 0h1.5m-1.5 0A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-1.5m-13.5 0v-8.25c0-.621.504-1.125 1.125-1.125h4.875c.621 0 1.125.504 1.125 1.125v1.875c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125.504 1.125 1.125V9.75"
				/>
			</svg>
			<span class="font-primary">{$i18n.t('Cases')}</span>
		</a>
	</Tooltip>

	<div class="ds-gnav-group-label mt-1.5">Operational</div>
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
			<svg
				class="ds-gnav-link__icon"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
				aria-hidden="true"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75A2.25 2.25 0 0 1 15.75 13.5H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25ZM13.5 6A2.25 2.25 0 0 1 15.75 3.75H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25A2.25 2.25 0 0 1 13.5 8.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25Z"
				/>
			</svg>
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
				<svg
					class="ds-gnav-link__icon"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					aria-hidden="true"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
					/>
				</svg>
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
			<svg
				class="ds-gnav-link__icon"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
				aria-hidden="true"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 15.803a7.5 7.5 0 0 0 10.607 0Z"
				/>
			</svg>
			<span class="font-primary">{$i18n.t('Search & Intel')}</span>
		</button>
	</Tooltip>
</div>
