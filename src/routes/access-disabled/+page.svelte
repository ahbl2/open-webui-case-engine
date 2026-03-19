<script lang="ts">
	import { user, caseEngineAuthState, caseEngineToken, caseEngineUser } from '$lib/stores';
	import { userSignOut } from '$lib/apis/auths';

	async function signOut() {
		await userSignOut().catch(() => {});
		user.set(null);
		caseEngineAuthState.set(null);
		caseEngineToken.set(null);
		caseEngineUser.set(null);
		localStorage.removeItem('token');
		location.href = '/auth';
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
	<div class="max-w-sm w-full text-center">
		<div class="mx-auto mb-5 flex items-center justify-center size-14 rounded-full bg-red-100 dark:bg-red-900/40">
			<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
				stroke="currentColor" class="size-7 text-red-600 dark:text-red-400">
				<path stroke-linecap="round" stroke-linejoin="round"
					d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
			</svg>
		</div>

		<h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
			Access Disabled
		</h1>

		<p class="text-sm text-gray-500 dark:text-gray-400 mb-1">
			Your account has been disabled.
		</p>
		<p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
			Contact your administrator if you believe this is an error.
		</p>

		{#if $user?.email || $user?.name}
			<p class="text-xs text-gray-400 dark:text-gray-500 mb-6">
				Signed in as <span class="font-medium text-gray-500 dark:text-gray-400">{$user?.email ?? $user?.name}</span>
			</p>
		{/if}

		<button
			class="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 underline transition"
			on:click={signOut}
		>
			Sign out
		</button>
	</div>
</div>
