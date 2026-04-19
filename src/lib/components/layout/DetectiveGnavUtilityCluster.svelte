<script lang="ts">
	/**
	 * P75-04 — Bottom sidebar: profile menu (GNAV). Settings / shortcuts / admin live in UserMenu only.
	 */
	import { getContext } from 'svelte';

	import { user, config } from '$lib/stores';
	import UserMenu from '$lib/components/layout/Sidebar/UserMenu.svelte';
	import { WEBUI_API_BASE_URL } from '$lib/constants';

	const i18n = getContext('i18n');
</script>

<div class="ds-gnav-utility-cluster" data-testid="detective-gnav-utility">
	{#if $user !== undefined && $user !== null}
		<UserMenu
			role={$user?.role}
			profile={$config?.features?.enable_user_status ?? true}
			help={true}
			showActiveUsers={false}
			className="max-w-[calc(var(--sidebar-width)-1rem)]"
		>
			<div class="ds-gnav-link w-full">
				<div class="self-center mr-2 relative shrink-0">
					<img
						src={`${WEBUI_API_BASE_URL}/users/${$user?.id}/profile/image`}
						class="size-6 object-cover rounded-full"
						alt={$i18n.t('Open User Profile Menu')}
						aria-label={$i18n.t('Open User Profile Menu')}
					/>
				</div>
				<div class="self-center font-medium truncate min-w-0">{$user?.name}</div>
			</div>
		</UserMenu>
	{/if}
</div>
