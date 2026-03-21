<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
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

	async function retry() {
		// P19.75-01: Re-run bootstrap — clear gate state, reload server data, land in workspace shell.
		caseEngineAuthState.set(null);
		await invalidateAll();
		await goto('/home');
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
			Service Unavailable
		</h1>

		<p class="text-sm text-gray-500 dark:text-gray-400 mb-1">
			The Case Engine authorization service could not be reached.
		</p>
		<p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
			Workspace access requires a successful authorization check. Please try again or contact your administrator.
		</p>

		{#if $user?.email || $user?.name}
			<p class="text-xs text-gray-400 dark:text-gray-500 mb-6">
				Signed in as <span class="font-medium text-gray-500 dark:text-gray-400">{$user?.email ?? $user?.name}</span>
			</p>
		{/if}

		<div class="flex flex-col gap-2 items-center">
			<button
				class="px-4 py-2 rounded-lg bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium hover:bg-gray-700 dark:hover:bg-white transition"
				on:click={retry}
			>
				Retry
			</button>
			<button
				class="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 underline transition"
				on:click={signOut}
			>
				Sign out
			</button>
		</div>
	</div>
</div>
