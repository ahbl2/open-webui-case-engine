<script lang="ts">
	import { getSurveillanceSession, logSurveillanceEvent, endSurveillanceSession } from '$lib/apis/operationsApi';
	import type { SurveillanceSession, SurveillanceEvent, SurveillanceSummary } from '$lib/apis/operationsApi';
	import { toast } from 'svelte-sonner';

	export let caseId: string;
	export let sessionId: string;
	export let token: string;

	export let session: SurveillanceSession | null = null;
	export let events: SurveillanceEvent[] = [];
	export let summary: SurveillanceSummary | null = null;

	export let onClose: () => void = () => {};
	export let onRefresh: () => void = () => {};

	let eventType = '';
	let eventDesc = '';
	let addingEvent = false;
	let endingSession = false;

	async function addEvent() {
		addingEvent = true;
		try {
			await logSurveillanceEvent(caseId, sessionId, token, {
				event_type: eventType.trim() || undefined,
				description: eventDesc.trim() || undefined
			});
			eventType = '';
			eventDesc = '';
			onRefresh();
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Failed to log event');
		} finally {
			addingEvent = false;
		}
	}

	async function endSession() {
		endingSession = true;
		try {
			await endSurveillanceSession(caseId, sessionId, token);
			onClose();
			onRefresh();
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Failed to end session');
		} finally {
			endingSession = false;
		}
	}

	function formatTime(iso: string) {
		try {
			return new Date(iso).toLocaleString();
		} catch {
			return iso;
		}
	}
</script>

<div class="border border-gray-200 dark:border-gray-600 rounded p-3 space-y-3">
	<div class="flex items-center justify-between">
		<h4 class="text-sm font-medium">{session?.title ?? 'Session'}</h4>
		<button type="button" class="text-xs text-gray-500 hover:underline" on:click={onClose}>← Back to list</button>
	</div>
	{#if session?.location}
		<p class="text-xs text-gray-500 dark:text-gray-400">Location: {session.location}</p>
	{/if}
	{#if session?.notes}
		<p class="text-xs text-gray-500 dark:text-gray-400">{session.notes}</p>
	{/if}
	<p class="text-xs text-gray-500 dark:text-gray-400">
		Started: {session ? formatTime(session.started_at) : ''}
		{#if session?.ended_at}
			· Ended: {formatTime(session.ended_at)}
		{/if}
	</p>

	{#if summary}
		<div class="bg-gray-100 dark:bg-gray-700 rounded p-2 text-sm">
			<strong>Summary</strong>: {summary.event_count} events
			{#if summary.duration_minutes != null}
				· Duration: {summary.duration_minutes} min
			{/if}
		</div>
	{/if}

	{#if session && !session.ended_at}
		<div class="border-t border-gray-200 dark:border-gray-600 pt-2">
			<p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Log event</p>
			<input
				type="text"
				bind:value={eventType}
				placeholder="Event type (e.g. vehicle, person)"
				class="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm mb-1"
			/>
			<input
				type="text"
				bind:value={eventDesc}
				placeholder="Description"
				class="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm mb-1"
			/>
			<button
				type="button"
				class="text-xs px-2 py-1 rounded bg-blue-600 text-white disabled:opacity-50"
				disabled={addingEvent}
				on:click={addEvent}
			>
				{addingEvent ? '…' : 'Add event'}
			</button>
		</div>
		<div class="pt-1">
			<button
				type="button"
				class="text-xs px-2 py-1 rounded bg-amber-600 text-white disabled:opacity-50"
				disabled={endingSession}
				on:click={endSession}
			>
				{endingSession ? '…' : 'End session'}
			</button>
		</div>
	{/if}

	<div>
		<p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Timeline</p>
		<ul class="list-none space-y-1">
			{#each events as ev (ev.id)}
				<li class="text-sm py-1 border-b border-gray-100 dark:border-gray-700">
					<span class="text-gray-500 dark:text-gray-400">{formatTime(ev.timestamp)}</span>
					{#if ev.event_type}
						<span class="font-medium ml-1">{ev.event_type}</span>
					{/if}
					{#if ev.description}
						<span class="ml-1">{ev.description}</span>
					{/if}
				</li>
			{/each}
		</ul>
		{#if events.length === 0}
			<p class="text-xs text-gray-500 dark:text-gray-400">No events yet.</p>
		{/if}
	</div>
</div>
