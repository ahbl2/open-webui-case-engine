<script lang="ts">
	/**
	 * P19-06 — Case entry redirect.
	 * P76-08 — Bare `/case/[id]` (bookmark/legacy); app-level navigations should prefer `/case/[id]/chat` directly.
	 *
	 * /case/[id] is the case root.  The case workspace shell (+layout.svelte)
	 * is already mounted at this point; this page simply redirects to the
	 * default case section so the URL is unambiguous and bookmarkable.
	 *
	 * replaceState: true prevents /case/[id] from appearing in browser history,
	 * so the back button returns to /cases rather than looping through the redirect.
	 */
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	onMount(() => {
		goto(`/case/${$page.params.id}/chat`, { replaceState: true });
	});
</script>
