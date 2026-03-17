<script lang="ts">
	import { toast } from 'svelte-sonner';
	import {
		getOperationalPlans,
		getOperationalTimeline,
		getOperationalTasks,
		getOperationProgressSummary,
		getInvestigatorTaskQueue,
		createOperationalPlan,
		scheduleOperationalEvent,
		getUnifiedOperationalTimeline,
		getPlanOperationalBrief,
		getCaseOperationalBrief,
		type OperationalPlan,
		type OperationalTimelineResponse,
		type OperationalTaskBoardResponse,
		type OperationProgressSummaryResponse,
		type InvestigatorTaskQueueResponse,
		type UnifiedOperationalTimelineEvent,
		type OperationalBrief
	} from '$lib/apis/operationsApi';
	import OperationalPlanList from '$lib/components/operations/OperationalPlanList.svelte';
	import OperationalTimeline from '$lib/components/operations/OperationalTimeline.svelte';
	import OperationalTaskBoard from '$lib/components/operations/OperationalTaskBoard.svelte';
	import InvestigatorTaskQueue from '$lib/components/operations/InvestigatorTaskQueue.svelte';
	import OperationProgressSummary from '$lib/components/operations/OperationProgressSummary.svelte';
	import EvidenceWorkflowPanel from '$lib/components/operations/EvidenceWorkflowPanel.svelte';
	import SurveillancePanel from '$lib/components/operations/SurveillancePanel.svelte';
	import UnifiedOperationalTimeline from '$lib/components/operations/UnifiedOperationalTimeline.svelte';
	import OperationalBriefPanel from '$lib/components/operations/OperationalBriefPanel.svelte';
	import OperationalExportPanel from '$lib/components/operations/OperationalExportPanel.svelte';

	export let caseId: string;
	export let token: string;
	export let currentUserId: string = '';

	let plans: OperationalPlan[] = [];
	let selectedPlan: OperationalPlan | null = null;
	let timeline: OperationalTimelineResponse | null = null;
	let taskBoard: OperationalTaskBoardResponse | null = null;
	let progressSummary: OperationProgressSummaryResponse | null = null;
	let taskQueue: InvestigatorTaskQueueResponse | null = null;
	let loadingPlans = false;
	let loadingTimeline = false;
	let loadingTasks = false;
	let loadingSummary = false;
	let loadingQueue = false;

	let createPlanOpen = false;
	let createPlanTitle = '';
	let createPlanSubmitting = false;

	let scheduleEventOpen = false;
	let scheduleEventTime = '';
	let scheduleEventNotes = '';
	let scheduleEventSubmitting = false;

	let planDetailTab: 'timeline' | 'tasks' | 'evidence' | 'surveillance' | 'unified' = 'timeline';
	let unifiedTimelineEvents: UnifiedOperationalTimelineEvent[] = [];
	let loadingUnifiedTimeline = false;

	let briefData: OperationalBrief | null = null;
	let loadingBrief = false;

	$: if (caseId && token) {
		loadPlans();
		loadTaskQueue();
	}
	$: if (caseId && token) {
		void selectedPlan?.id;
		loadSummary();
	}

	$: if (caseId && token && selectedPlan) {
		loadTimeline(selectedPlan.id);
		loadTaskBoard(selectedPlan.id);
		loadUnifiedTimeline(selectedPlan.id);
	} else {
		timeline = null;
		taskBoard = null;
		unifiedTimelineEvents = [];
	}
	$: if (caseId && token) {
		void selectedPlan?.id;
		loadBrief();
	}

	async function loadPlans() {
		if (!caseId || !token) return;
		loadingPlans = true;
		try {
			plans = await getOperationalPlans(caseId, token);
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Failed to load plans');
			plans = [];
		} finally {
			loadingPlans = false;
		}
	}

	async function loadTimeline(planId: string) {
		if (!caseId || !token) return;
		loadingTimeline = true;
		try {
			timeline = await getOperationalTimeline(caseId, planId, token);
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Failed to load timeline');
			timeline = null;
		} finally {
			loadingTimeline = false;
		}
	}

	async function loadTaskBoard(planId: string) {
		if (!caseId || !token) return;
		loadingTasks = true;
		try {
			taskBoard = await getOperationalTasks(caseId, token, planId);
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Failed to load tasks');
			taskBoard = null;
		} finally {
			loadingTasks = false;
		}
	}

	async function loadUnifiedTimeline(planId: string) {
		if (!caseId || !token) return;
		loadingUnifiedTimeline = true;
		try {
			unifiedTimelineEvents = await getUnifiedOperationalTimeline(caseId, planId, token);
		} catch (e) {
			unifiedTimelineEvents = [];
		} finally {
			loadingUnifiedTimeline = false;
		}
	}

	async function loadBrief() {
		if (!caseId || !token) return;
		loadingBrief = true;
		try {
			if (selectedPlan) {
				briefData = await getPlanOperationalBrief(caseId, selectedPlan.id, token);
			} else {
				briefData = await getCaseOperationalBrief(caseId, token);
			}
		} catch (e) {
			briefData = null;
		} finally {
			loadingBrief = false;
		}
	}

	async function loadSummary() {
		if (!caseId || !token) return;
		loadingSummary = true;
		try {
			progressSummary = await getOperationProgressSummary(
				caseId,
				token,
				selectedPlan?.id
			);
		} catch (e) {
			progressSummary = null;
		} finally {
			loadingSummary = false;
		}
	}

	async function loadTaskQueue() {
		if (!caseId || !token) return;
		loadingQueue = true;
		try {
			taskQueue = await getInvestigatorTaskQueue(caseId, token, currentUserId || undefined);
		} catch (e) {
			taskQueue = null;
		} finally {
			loadingQueue = false;
		}
	}

	function refresh() {
		loadPlans();
		loadSummary();
		loadTaskQueue();
		loadBrief();
		if (selectedPlan) {
			loadTimeline(selectedPlan.id);
			loadTaskBoard(selectedPlan.id);
			loadUnifiedTimeline(selectedPlan.id);
		}
	}

	function selectPlan(plan: OperationalPlan) {
		selectedPlan = plan;
	}

	async function submitCreatePlan() {
		const title = createPlanTitle.trim();
		if (!title) {
			toast.error('Title is required');
			return;
		}
		createPlanSubmitting = true;
		try {
			await createOperationalPlan(caseId, token, { title });
			toast.success('Plan created');
			createPlanOpen = false;
			createPlanTitle = '';
			loadPlans();
			loadSummary();
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Create failed');
		} finally {
			createPlanSubmitting = false;
		}
	}

	async function submitScheduleEvent() {
		if (!selectedPlan) return;
		const eventTime = scheduleEventTime.trim();
		if (!eventTime) {
			toast.error('Planned time is required (ISO format)');
			return;
		}
		scheduleEventSubmitting = true;
		try {
			await scheduleOperationalEvent(caseId, token, {
				operational_plan_id: selectedPlan.id,
				event_time_planned: eventTime,
				notes: scheduleEventNotes.trim() || undefined
			});
			toast.success('Event scheduled');
			scheduleEventOpen = false;
			scheduleEventTime = '';
			scheduleEventNotes = '';
			loadTimeline(selectedPlan.id);
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Schedule failed');
		} finally {
			scheduleEventSubmitting = false;
		}
	}
</script>

<div class="flex flex-col gap-4 p-2">
	<h2 class="text-lg font-medium">Operational Workspace</h2>

	<section>
		<h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Progress summary</h3>
		<OperationProgressSummary summary={progressSummary} />
	</section>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
		<div>
			<div class="flex items-center justify-between mb-1">
				<h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Plans</h3>
				<button
					type="button"
					class="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
					on:click={() => (createPlanOpen = true)}
				>New plan</button>
			</div>
			<OperationalPlanList
				plans={plans}
				selectedPlanId={selectedPlan?.id ?? null}
				loading={loadingPlans}
				onSelect={selectPlan}
			/>
		</div>

		<div class="lg:col-span-2 space-y-4">
			{#if selectedPlan}
				<div class="flex gap-1 border-b border-gray-200 dark:border-gray-600 pb-1">
					<button
						type="button"
						class="text-xs px-2 py-1.5 rounded {planDetailTab === 'timeline'
							? 'bg-gray-200 dark:bg-gray-600 font-medium'
							: 'hover:bg-gray-100 dark:hover:bg-gray-800'}"
						on:click={() => (planDetailTab = 'timeline')}
					>Timeline</button>
					<button
						type="button"
						class="text-xs px-2 py-1.5 rounded {planDetailTab === 'tasks'
							? 'bg-gray-200 dark:bg-gray-600 font-medium'
							: 'hover:bg-gray-100 dark:hover:bg-gray-800'}"
						on:click={() => (planDetailTab = 'tasks')}
					>Tasks</button>
					<button
						type="button"
						class="text-xs px-2 py-1.5 rounded {planDetailTab === 'evidence'
							? 'bg-gray-200 dark:bg-gray-600 font-medium'
							: 'hover:bg-gray-100 dark:hover:bg-gray-800'}"
						on:click={() => (planDetailTab = 'evidence')}
					>Evidence</button>
					<button
						type="button"
						class="text-xs px-2 py-1.5 rounded {planDetailTab === 'surveillance'
							? 'bg-gray-200 dark:bg-gray-600 font-medium'
							: 'hover:bg-gray-100 dark:hover:bg-gray-800'}"
						on:click={() => (planDetailTab = 'surveillance')}
					>Surveillance</button>
					<button
						type="button"
						class="text-xs px-2 py-1.5 rounded {planDetailTab === 'unified'
							? 'bg-gray-200 dark:bg-gray-600 font-medium'
							: 'hover:bg-gray-100 dark:hover:bg-gray-800'}"
						on:click={() => (planDetailTab = 'unified')}
					>Operational Timeline</button>
				</div>
				{#if planDetailTab === 'timeline'}
					<section>
						<div class="flex items-center justify-between mb-1">
							<h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Timeline: {selectedPlan.title}</h3>
							<button
								type="button"
								class="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
								on:click={() => (scheduleEventOpen = true)}
							>Schedule event</button>
						</div>
						<OperationalTimeline events={timeline?.events ?? []} />
					</section>
				{:else if planDetailTab === 'tasks'}
					<section>
						<h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Task board</h3>
						<OperationalTaskBoard
							{caseId}
							{token}
							board={taskBoard}
							loading={loadingTasks}
							{currentUserId}
							onRefresh={refresh}
						/>
					</section>
				{:else if planDetailTab === 'evidence'}
					<section>
						<EvidenceWorkflowPanel
							{caseId}
							planId={selectedPlan.id}
							{token}
							onRefresh={refresh}
						/>
					</section>
				{:else if planDetailTab === 'surveillance'}
					<section>
						<SurveillancePanel
							{caseId}
							planId={selectedPlan.id}
							{token}
							onRefresh={refresh}
						/>
					</section>
				{:else if planDetailTab === 'unified'}
					<section>
						<h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Operational Timeline</h3>
						<UnifiedOperationalTimeline
							events={unifiedTimelineEvents}
							loading={loadingUnifiedTimeline}
						/>
					</section>
				{/if}
			{:else}
				<p class="text-sm text-gray-500 dark:text-gray-400">Select a plan to view timeline and tasks.</p>
			{/if}
		</div>
	</div>

	<section>
		<h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">My task queue</h3>
		<InvestigatorTaskQueue queue={taskQueue} loading={loadingQueue} />
	</section>

	<section>
		<h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Operational Brief</h3>
		<OperationalBriefPanel brief={briefData} loading={loadingBrief} />
	</section>

	{#if selectedPlan}
		<section>
			<OperationalExportPanel
				{caseId}
				planId={selectedPlan.id}
				{token}
			/>
		</section>
	{/if}

	{#if createPlanOpen}
		<div class="fixed inset-0 z-10 flex items-center justify-center bg-black/30" role="dialog">
			<div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-sm w-full mx-2">
				<h4 class="font-medium mb-2">New operational plan</h4>
				<input
					type="text"
					bind:value={createPlanTitle}
					placeholder="Plan title"
					class="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm mb-2"
				/>
				<div class="flex gap-2 justify-end">
					<button type="button" class="px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 text-sm" on:click={() => (createPlanOpen = false)}>Cancel</button>
					<button type="button" class="px-2 py-1 rounded bg-blue-600 text-white text-sm disabled:opacity-50" disabled={createPlanSubmitting} on:click={submitCreatePlan}>Create</button>
				</div>
			</div>
		</div>
	{/if}

	{#if scheduleEventOpen && selectedPlan}
		<div class="fixed inset-0 z-10 flex items-center justify-center bg-black/30" role="dialog">
			<div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-sm w-full mx-2">
				<h4 class="font-medium mb-2">Schedule event</h4>
				<label class="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Planned time (ISO)</label>
				<input
					type="text"
					bind:value={scheduleEventTime}
					placeholder="2025-03-20T14:00:00.000Z"
					class="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm mb-2"
				/>
				<label class="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Notes (optional)</label>
				<input
					type="text"
					bind:value={scheduleEventNotes}
					placeholder="Notes"
					class="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm mb-2"
				/>
				<div class="flex gap-2 justify-end">
					<button type="button" class="px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 text-sm" on:click={() => (scheduleEventOpen = false)}>Cancel</button>
					<button type="button" class="px-2 py-1 rounded bg-blue-600 text-white text-sm disabled:opacity-50" disabled={scheduleEventSubmitting} on:click={submitScheduleEvent}>Schedule</button>
				</div>
			</div>
		</div>
	{/if}
</div>
