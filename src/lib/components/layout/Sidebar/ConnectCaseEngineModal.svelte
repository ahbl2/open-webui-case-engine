<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { caseEngineToken, caseEngineUser, activeCaseId, activeCaseNumber } from '$lib/stores';
	import { login } from '$lib/apis/caseEngine';

	export let show = false;

	const dispatch = createEventDispatcher();

	let name = '';
	let password = '';
	let error = '';
	let loading = false;

	async function handleConnect() {
		error = '';
		if (!name.trim() || !password) {
			error = 'Name and password required';
			return;
		}
		loading = true;
		try {
			const { token, user } = await login(name.trim(), password);
			// Clear active case when switching context to avoid stale chip/state.
			activeCaseId.set(null);
			activeCaseNumber.set(null);
			caseEngineToken.set(token);
			caseEngineUser.set(user);
			dispatch('connected');
		} catch (e: any) {
			error = e?.message ?? 'Invalid credentials';
		} finally {
			loading = false;
		}
	}

	function handleClose() {
		error = '';
		name = '';
		password = '';
		dispatch('close');
	}
</script>

{#if show}
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
		role="dialog"
		aria-modal="true"
		on:keydown={(e) => e.key === 'Escape' && handleClose()}
		on:click={handleClose}
	>
		<div
			class="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-sm"
			on:click|stopPropagation
		>
			<h3 class="text-lg font-semibold mb-4">Connect to Case Engine</h3>
			<form on:submit|preventDefault={handleConnect}>
				<div class="space-y-3">
					<div>
						<label class="block text-sm font-medium mb-1" for="ce-name">Name</label>
						<input
							id="ce-name"
							type="text"
							bind:value={name}
							class="w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2"
							placeholder="Username"
						/>
					</div>
					<div>
						<label class="block text-sm font-medium mb-1" for="ce-password">Password</label>
						<input
							id="ce-password"
							type="password"
							bind:value={password}
							class="w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2"
							placeholder="Password"
						/>
					</div>
					{#if error}
						<div class="text-sm text-red-600 dark:text-red-400">{error}</div>
					{/if}
				</div>
				<div class="flex justify-end gap-2 mt-4">
					<button
						type="button"
						class="px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
						on:click={handleClose}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
						disabled={loading}
					>
						{loading ? 'Connecting...' : 'Connect'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
