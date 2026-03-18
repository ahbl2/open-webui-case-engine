<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';

	import { page } from '$app/stores';
	import { activeCaseId, caseEngineToken, caseEngineAuthState } from '$lib/stores';

	onMount(() => {
		if ($page.url.searchParams.get('error')) {
			toast.error($page.url.searchParams.get('error') || 'An unknown error occurred.');
		}
		// P19-05: Route away from the generic root to the app-controlled Cases landing.
		// Preserve deep-link to an active case if one is already selected.
		if ($activeCaseId && $caseEngineToken) {
			goto(`/case/${$activeCaseId}`);
		} else {
			goto('/cases');
		}
	});
</script>

<!-- Blank while redirect resolves; no Chat component as default landing. -->
<div class="flex-1 flex items-center justify-center h-full">
	<div class="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 border-t-transparent rounded-full animate-spin"></div>
</div>
