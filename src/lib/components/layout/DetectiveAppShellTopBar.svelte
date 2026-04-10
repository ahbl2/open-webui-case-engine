<script lang="ts">
	/**
	 * P75-05 — Wave 2 app shell top utility: route context, global search affordance (opens existing SearchModal),
	 * unit scope indicator, keyboard shortcuts entry. Gated by parent `DetectiveAppShellFrame` + layout flag only.
	 * P75-08 — Search is modal-first; `/search` route also opens the same modal (see `routes/(app)/search/+page.svelte`).
	 * P75-09 — `SearchModal` is the only global search/command surface (modes: Search, Jump, Command, Workspace).
	 */
	import { getContext } from 'svelte';
	import { page } from '$app/stores';

	import { showSearch, showShortcuts, scope } from '$lib/stores';
	import {
		DS_TYPE_CLASSES,
		DS_APP_SHELL_CLASSES,
		DS_BADGE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';

	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import Search from '$lib/components/icons/Search.svelte';
	import Keyboard from '$lib/components/icons/Keyboard.svelte';

	const i18n = getContext('i18n');

	$: pathname = $page.url.pathname;
	$: surface = pathname.startsWith('/admin')
		? $i18n.t('Admin')
		: pathname === '/cases' || pathname.startsWith('/cases/')
			? $i18n.t('Cases')
			: pathname === '/home' || pathname.startsWith('/home/')
				? $i18n.t('Home')
				: pathname === '/search' || pathname.startsWith('/search/')
					? $i18n.t('Search')
					: $i18n.t('Workspace');

	$: scopeText =
		$scope === 'THIS_CASE'
			? $i18n.t('This Case')
			: $scope === 'ALL'
				? 'ALL'
				: $scope;
</script>

<div
	class="flex min-w-0 flex-1 flex-row flex-wrap items-center gap-2 sm:gap-3"
	data-testid="detective-app-shell-top-bar"
>
	<div class="{DS_APP_SHELL_CLASSES.topContext} max-w-[min(100%,12rem)] sm:max-w-[14rem]">
		<span
			class="{DS_TYPE_CLASSES.label} uppercase tracking-wide text-[color:var(--ds-text-muted)]"
		>
			{$i18n.t('Workspace')}
		</span>
		<span
			class="truncate font-semibold leading-tight text-[color:var(--ds-text-on-canvas)]"
			title={surface}
		>
			{surface}
		</span>
	</div>

	<div class="flex min-w-0 flex-[1_1_12rem] justify-center">
		<button
			type="button"
			class="{DS_APP_SHELL_CLASSES.topSearchTrigger}"
			aria-label={$i18n.t('Open global search')}
			data-testid="detective-app-shell-search-trigger"
			on:click={() => showSearch.set(true)}
		>
			<Search className="size-4 shrink-0 opacity-85" strokeWidth="2" />
			<span class="min-w-0 flex-1 truncate text-[color:var(--ds-text-muted)]">
				{$i18n.t('Search & Intel')}
			</span>
		</button>
	</div>

	<div class="{DS_APP_SHELL_CLASSES.topActions} ml-auto">
		<Tooltip
			content={$i18n.t('Ask / chat unit scope — cross-case behavior follows Case Engine rules.')}
			placement="bottom"
		>
			<span
				class="{DS_BADGE_CLASSES.neutral} max-w-[6rem] shrink-0 truncate px-2 py-0.5 text-[length:var(--ds-type-meta-size)]"
				data-testid="detective-app-shell-scope-chip"
				role="status"
				title={scopeText}
			>
				{scopeText}
			</span>
		</Tooltip>
		<Tooltip content={$i18n.t('Keyboard shortcuts')} placement="bottom">
			<button
				type="button"
				class="ds-gnav-utility-icon border-0 bg-transparent"
				aria-label={$i18n.t('Keyboard shortcuts')}
				data-testid="detective-app-shell-shortcuts-trigger"
				on:click={() => showShortcuts.update((v) => !v)}
			>
				<Keyboard className="size-4" />
			</button>
		</Tooltip>
	</div>
</div>
