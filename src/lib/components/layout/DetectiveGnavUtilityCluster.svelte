<script lang="ts">
	/**
	 * P75-04 — Bottom sidebar utility cluster: quick actions + profile menu (GNAV spec §Sidebar).
	 * Settings / shortcuts / admin (RBAC) as compact icons; Profile / Help / Logout via UserMenu.
	 */
	import { tick } from 'svelte';
	import { get } from 'svelte/store';
	import { getContext } from 'svelte';

	import { mobile, showSidebar, showSettings, showShortcuts, user, config } from '$lib/stores';
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import UserMenu from '$lib/components/layout/Sidebar/UserMenu.svelte';
	import Settings from '$lib/components/icons/Settings.svelte';
	import Keyboard from '$lib/components/icons/Keyboard.svelte';
	import UserGroup from '$lib/components/icons/UserGroup.svelte';
	import { WEBUI_API_BASE_URL } from '$lib/constants';

	const i18n = getContext('i18n');

	/** Mirrors primary nav: close mobile drawer after an action. */
	export let onUtilityActivate: () => void = () => {};

	async function afterUtilityAction() {
		onUtilityActivate();
		if (get(mobile)) {
			await tick();
			showSidebar.set(false);
		}
	}

	function openSettings() {
		showSettings.set(true);
		afterUtilityAction();
	}

	function toggleShortcuts() {
		showShortcuts.update((v) => !v);
		afterUtilityAction();
	}
</script>

<div class="ds-gnav-utility-cluster" data-testid="detective-gnav-utility">
	<div class="ds-gnav-utility-row" role="toolbar" aria-label={$i18n.t('Quick settings and utilities')}>
		<Tooltip className="inline-flex" content={$i18n.t('Personal Preferences')} placement="top">
			<button
				type="button"
				class="ds-gnav-utility-icon"
				aria-label={$i18n.t('Personal Preferences')}
				on:click={openSettings}
			>
				<Settings className="size-4" strokeWidth="1.5" />
			</button>
		</Tooltip>
		<Tooltip className="inline-flex" content={$i18n.t('Keyboard shortcuts')} placement="top">
			<button
				type="button"
				class="ds-gnav-utility-icon"
				aria-label={$i18n.t('Keyboard shortcuts')}
				on:click={toggleShortcuts}
			>
				<Keyboard className="size-4" />
			</button>
		</Tooltip>
		{#if $user?.role === 'admin'}
			<Tooltip className="inline-flex" content={$i18n.t('Admin Panel')} placement="top">
				<a
					href="/admin"
					draggable="false"
					class="ds-gnav-utility-icon"
					aria-label={$i18n.t('Admin Panel')}
					on:click={afterUtilityAction}
				>
					<UserGroup className="size-4" strokeWidth="1.5" />
				</a>
			</Tooltip>
		{/if}
	</div>

	{#if $user !== undefined && $user !== null}
		<UserMenu
			role={$user?.role}
			profile={$config?.features?.enable_user_status ?? true}
			help={true}
			showActiveUsers={false}
			className="max-w-[calc(var(--sidebar-width)-1rem)]"
		>
			<div
				class="flex items-center rounded-2xl py-2 px-1.5 w-full hover:bg-gray-100/50 dark:hover:bg-gray-900/50 transition"
			>
				<div class="self-center mr-3 relative">
					<img
						src={`${WEBUI_API_BASE_URL}/users/${$user?.id}/profile/image`}
						class="size-7 object-cover rounded-full"
						alt={$i18n.t('Open User Profile Menu')}
						aria-label={$i18n.t('Open User Profile Menu')}
					/>
				</div>
				<div class="self-center font-medium truncate min-w-0">{$user?.name}</div>
			</div>
		</UserMenu>
	{/if}
</div>
