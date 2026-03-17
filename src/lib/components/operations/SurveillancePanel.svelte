<script lang="ts">
	import { getSurveillanceSessions, createSurveillanceSession, getSurveillanceSession } from '$lib/apis/operationsApi';
	import type { SurveillanceSession } from '$lib/apis/operationsApi';
	import SurveillanceSessionView from './SurveillanceSession.svelte';
	import { toast } from 'svelte-sonner';

	export let caseId: string;
	export let planId: string;
	export let token: string;

	let sessions: SurveillanceSession[] = [];
	let loading = false;
	let startOpen = false;
	let startTitle = '';
	let startLocation = '';
	let startNotes = '';
	let startSubmitting = false;

	let selectedSessionId: string | null = null;
	let sessionDetail: Awaited<ReturnType<typeof getSurveillanceSession>> | null = null;
	let loadingDetail = false;

	export let onRefresh: () => void = () => {};

	$: if (caseId && planId && token) {
		load();
	}

	async function load() {
		if (!caseId || !planId || !token) return;
		loading = true;
		try {
			sessions = await getSurveillanceSessions(caseId, planId, token);
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Failed to load surveillance sessions');
			sessions = [];
		} finally {
			loading = false;
		}
		if (!selectedSessionId) sessionDetail = null;
	}

	async function loadSessionDetail(sid: string) {
		if (!caseId || !token) return;
		loadingDetail = true;
		try {
			sessionDetail = await getSurveillanceSession(caseId, sid, token);
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Failed to load session');
			sessionDetail = null;
		} finally {
			loadingDetail = false;
		}
	}

	function selectSession(s: SurveillanceSession) {
		selectedSessionId = s.id;
		loadSessionDetail(s.id);
	}

	function closeSessionDetail() {
		selectedSessionId = null;
		sessionDetail = null;
	}

	async function submitStart() {
		const title = startTitle.trim();
		if (!title) {
			toast.error('Title is required');
			return;
		}
		startSubmitting = true;
		try {
			await createSurveillanceSession(caseId, planId, token, {
				title,
				location: startLocation.trim() || undefined,
				notes: startNotes.trim() || undefined
			});
			toast.success('Surveillance session started');
			startOpen = false;
			startTitle = '';
			startLocation = '';
			startNotes = '';
			load();
			onRefresh();
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Start failed');
		} finally {
			startSubmitting = false;
		}
	}

	function refreshSessionDetail() {
		if (selectedSessionId) loadSessionDetail(selectedSessionId);
		load();
	}
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between">
		<h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Surveillance</h3>
		<button
			type="button"
			class="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
			on:click={() => (startOpen = true)}
		>Start session</button>
	</div>
	{#if selectedSessionId && sessionDetail}
		<SurveillanceSessionView
			{caseId}
			sessionId={selectedSessionId}
			{token}
			session={sessionDetail.session}
			events={sessionDetail.events}
			summary={sessionDetail.summary}
			onClose={closeSessionDetail}
			onRefresh={refreshSessionDetail}
		/>
	{:else}
		{#if loading}
			<p class="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
		{:else if sessions.length === 0}
			<p class="text-sm text-gray-500 dark:text-gray-400">No surveillance sessions for this plan.</p>
		{:else}
			<ul class="list-none space-y-1">
				{#each sessions as s (s.id)}
					<li>
						<button
							type="button"
							class="w-full text-left px-3 py-2 rounded text-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
							on:click={() => selectSession(s)}
						>
							<span class="block font-medium">{s.title}</span>
							<span class="block text-xs text-gray-500 dark:text-gray-400">
								{new Date(s.started_at).toLocaleString()}
								{#if s.ended_at}
									· Ended {new Date(s.ended_at).toLocaleString()}
								{:else}
									· Active
								{/if}
							</span>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</div>

{#if startOpen}
	<div class="fixed inset-0 z-10 flex items-center justify-center bg-black/30" role="dialog">
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-sm w-full mx-2">
			<h4 class="font-medium mb-2">Start surveillance session</h4>
			<label class="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Title</label>
			<input
				type="text"
				bind:value={startTitle}
				placeholder="Session title"
				class="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm mb-2"
			/>
			<label class="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Location (optional)</label>
			<input
				type="text"
				bind:value={startLocation}
				placeholder="Location"
				class="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm mb-2"
			/>
			<label class="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Notes (optional)</label>
			<input
				type="text"
				bind:value={startNotes}
				placeholder="Notes"
				class="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm mb-2"
			/>
			<div class="flex gap-2 justify-end">
				<button type="button" class="px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 text-sm" on:click={() => (startOpen = false)}>Cancel</button>
				<button type="button" class="px-2 py-1 rounded bg-blue-600 text-white text-sm disabled:opacity-50" disabled={startSubmitting} on:click={submitStart}>Start</button>
			</div>
		</div>
	</div>
{/if}
