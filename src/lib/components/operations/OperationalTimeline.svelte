<script lang="ts">
	import type { OperationalEvent } from '$lib/apis/operationsApi';

	export let events: OperationalEvent[] = [];

	function formatTime(iso: string | null | undefined): string {
		if (!iso) return '—';
		try {
			const d = new Date(iso);
			return d.toLocaleString();
		} catch {
			return iso;
		}
	}
</script>

<div class="space-y-2">
	{#if events.length === 0}
		<p class="text-sm text-gray-500 dark:text-gray-400">No events.</p>
	{:else}
		<ul class="divide-y divide-gray-200 dark:divide-gray-600">
			{#each events as event (event.id)}
				<li class="py-2">
					<div class="text-sm font-medium">{event.event_type || 'Event'}</div>
					<div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
						Planned: {formatTime(event.event_time_planned)} · Actual: {formatTime(event.event_time_actual)}
					</div>
					<div class="text-xs mt-1">
						<span class="rounded px-1 bg-gray-100 dark:bg-gray-700">{event.status}</span>
					</div>
					{#if event.notes}
						<p class="text-sm mt-1 text-gray-700 dark:text-gray-300">{event.notes}</p>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>
