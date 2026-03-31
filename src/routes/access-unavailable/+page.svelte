<script lang="ts">
	import { goto } from '$app/navigation';
	import { user, caseEngineAuthState, caseEngineToken, caseEngineUser } from '$lib/stores';
	import { resolveBrowserAuthOnce, BrowserResolveFailure } from '$lib/apis/caseEngine';
	import { userSignOut } from '$lib/apis/auths';
	import { accessUnavailableBanner } from '$lib/utils/accessUnavailableBanner';
	import { get } from 'svelte/store';

	let retrying = false;
	let retryMessage = '';

	/** P19.75-02: Same route as true outages (P20-PRE-01); copy must match actual `caseEngineAuthState`. */
	$: banner = accessUnavailableBanner($caseEngineAuthState?.state ?? null);

	async function signOut() {
		await userSignOut().catch(() => {});
		user.set(null);
		caseEngineAuthState.set(null);
		caseEngineToken.set(null);
		caseEngineUser.set(null);
		localStorage.removeItem('token');
		location.href = '/auth';
	}

	async function retry() {
		if (retrying) return;
		const currentUser = get(user);
		if (!currentUser?.id) {
			await goto('/auth');
			return;
		}
		const owuiToken = localStorage.getItem('token');
		if (!owuiToken || String(owuiToken).trim() === '') {
			retryMessage = 'Your Open WebUI session has expired. Please sign in again.';
			await goto('/auth');
			return;
		}

		retrying = true;
		retryMessage = '';
		try {
			const authResult = await resolveBrowserAuthOnce({
				owui_user_id: currentUser.id,
				username_or_email:
					(currentUser as { email?: string }).email ?? currentUser.name ?? currentUser.id,
				display_name: currentUser.name
			}, { force: true });
			caseEngineAuthState.set(authResult as import('$lib/stores').CaseEngineAuthState);
			if (authResult.state === 'active' && typeof authResult.token === 'string' && authResult.token.trim() !== '') {
				caseEngineToken.set(authResult.token);
				caseEngineUser.set(
					authResult.user
						? {
								id: authResult.user.id,
								name: currentUser.name ?? authResult.user.role,
								role: authResult.user.role === 'admin' ? 'ADMIN' : 'detective'
							}
						: null
				);
				await goto('/home');
				return;
			}
			retryMessage =
				authResult.state === 'rate_limited'
					? 'System is temporarily busy. Please wait a moment and try again.'
					: 'Case Engine authorization is still unavailable.';
		} catch (err) {
			if (err instanceof BrowserResolveFailure && err.classification === 'rate_limited') {
				retryMessage = 'System is temporarily busy. Please wait a moment and try again.';
			} else {
				retryMessage = 'Case Engine authorization is still unavailable.';
			}
		} finally {
			retrying = false;
		}
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
	<div class="max-w-sm w-full text-center">
		<div class="mx-auto mb-5 flex items-center justify-center size-14 rounded-full bg-orange-100 dark:bg-orange-900/40">
			<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
				stroke="currentColor" class="size-7 text-orange-600 dark:text-orange-400">
				<path stroke-linecap="round" stroke-linejoin="round"
					d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
			</svg>
		</div>

		<h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
			{banner.title}
		</h1>

		<p class="text-sm text-gray-500 dark:text-gray-400 mb-1">
			{banner.lead}
		</p>
		<p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
			{banner.hint}
		</p>

		{#if $user?.email || $user?.name}
			<p class="text-xs text-gray-400 dark:text-gray-500 mb-6">
				Signed in as <span class="font-medium text-gray-500 dark:text-gray-400">{$user?.email ?? $user?.name}</span>
			</p>
		{/if}

		<div class="flex flex-col gap-2 items-center">
			<button
				class="px-4 py-2 rounded-lg bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium hover:bg-gray-700 dark:hover:bg-white transition"
				disabled={retrying}
				on:click={retry}
			>
				{retrying ? 'Retrying...' : 'Retry'}
			</button>
			{#if retryMessage}
				<p class="text-xs text-orange-600 dark:text-orange-400">{retryMessage}</p>
			{/if}
			<button
				class="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 underline transition"
				on:click={signOut}
			>
				Sign out
			</button>
		</div>
	</div>
</div>
