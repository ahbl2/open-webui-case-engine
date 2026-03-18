<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	import Chat from '$lib/components/chat/Chat.svelte';
	import { page } from '$app/stores';
	import { activeCaseId, caseEngineToken } from '$lib/stores';

	onMount(() => {
		if ($page.url.searchParams.get('error')) {
			toast.error($page.url.searchParams.get('error') || 'An unknown error occurred.');
		}
	});
</script>

{#if $activeCaseId && $caseEngineToken}
	<!--
		A case is active. The case workspace lives at /case/{id} — rendered
		by the sidebar case click handler via goto().
		Do NOT mount the default chat view here; it must not render alongside
		or beneath the case workspace.
	-->
{:else}
	<Chat />
{/if}
