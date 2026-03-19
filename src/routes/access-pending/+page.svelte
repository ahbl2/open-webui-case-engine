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
		<div class="mx-auto mb-5 flex items-center justify-center size-14 rounded-full bg-amber-100 dark:bg-amber-900/40">
			<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
				stroke="currentColor" class="size-7 text-amber-600 dark:text-amber-400">
				<path stroke-linecap="round" stroke-linejoin="round"
					d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
			</svg>
		</div>

		<h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
			Access Pending
		</h1>

		<p class="text-sm text-gray-500 dark:text-gray-400 mb-1">
			Your account is awaiting approval from an administrator.
		</p>
		<p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
			Once approved, you will be able to access the detective workspace.
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
