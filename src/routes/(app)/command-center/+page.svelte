<!--
	P131-01 — Operator Command Center route (framing + placeholders only; no data).
-->
<script lang="ts">
	import CommandCenterPanel from '$lib/components/operator/CommandCenterPanel.svelte';
</script>

<svelte:head>
	<title>Command Center</title>
</svelte:head>

<div class="flex min-h-0 flex-1 flex-col overflow-hidden" data-testid="command-center-page">
	<CommandCenterPanel />
</div>
