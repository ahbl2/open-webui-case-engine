<script lang="ts">
	import type { UnifiedOperationalTimelineEvent } from '$lib/apis/operationsApi';

	export let events: UnifiedOperationalTimelineEvent[] = [];
	export let loading = false;

	function formatTime(iso: string): string {
		try {
			return new Date(iso).toLocaleString();
		} catch {
			return iso;
		}
	}
</script>

<div class="space-y-2">
	{#if loading}
		<p class="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
	{:else if events.length === 0}
		<p class="text-sm text-gray-500 dark:text-gray-400">No operational timeline events.</p>
	{:else}
		<ul class="divide-y divide-gray-200 dark:divide-gray-600">
			{#each events as event (event.id)}
				<li class="py-2">
					<div class="text-xs text-gray-500 dark:text-gray-400">{formatTime(event.timestamp)}</div>
					<div class="text-sm font-medium mt-0.5">
						<span class="rounded px-1 bg-gray-100 dark:bg-gray-700">{event.event_type}</span>
						{#if event.source_type}
							<span class="text-gray-400 dark:text-gray-500 ml-1">({event.source_type})</span>
						{/if}
					</div>
					{#if event.description}
						<p class="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{event.description}</p>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>
