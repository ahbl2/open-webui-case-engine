<script lang="ts">
	/**
	 * P75-04 — Core + operational primary app navigation (GNAV).
	 * Ordering: Home → Cases → Search & intel — GLOBAL_NAVIGATION_AND_COMMAND_SPEC.md (DetectiveCaseEngine docs).
	 */
	import { page } from '$app/stores';
	import { showSearch } from '$lib/stores';
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

<div class="px-[0.4375rem] mt-1 mb-0.5" data-testid="detective-gnav-primary">
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
				stroke-width="2"
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
				stroke-width="2"
				stroke="currentColor"
				aria-hidden="true"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
				/>
			</svg>
			<span class="font-primary">{$i18n.t('Cases')}</span>
		</a>
	</Tooltip>

	<div class="ds-gnav-group-label mt-3">Operational</div>
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
				stroke-width="2"
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
