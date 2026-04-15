<!--
	P132-05 — Governance route (read-only; access decided by Case Engine on GET).
-->
<script lang="ts">
	import GovernancePanel from '$lib/components/operator/GovernancePanel.svelte';
</script>

<svelte:head>
	<title>Governance</title>
</svelte:head>

<div class="flex min-h-0 flex-1 flex-col overflow-hidden" data-testid="governance-page">
	<GovernancePanel />
</div>
