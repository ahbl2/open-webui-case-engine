<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';

	import { page } from '$app/stores';

	onMount(() => {
		if ($page.url.searchParams.get('error')) {
			toast.error($page.url.searchParams.get('error') || 'An unknown error occurred.');
		}
		// P19-05: Default post-login landing is My Desktop (/home).
		// Do NOT use activeCaseId/caseEngineToken for redirect — stale state must not
		// hijack initial login. User reaches a case only by explicit navigation.
		goto('/home');
	});
</script>

<!-- Blank while redirect resolves; no Chat component as default landing. -->
<div class="flex-1 flex items-center justify-center h-full">
	<div class="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 border-t-transparent rounded-full animate-spin"></div>
</div>
