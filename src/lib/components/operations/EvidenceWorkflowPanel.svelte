<script lang="ts">
	import { getEvidenceWorkflows, createEvidenceWorkflow, completeEvidenceWorkflowStep } from '$lib/apis/operationsApi';
	import type { EvidenceWorkflow } from '$lib/apis/operationsApi';
	import EvidenceWorkflowSteps from './EvidenceWorkflowSteps.svelte';
	import { toast } from 'svelte-sonner';

	export let caseId: string;
	export let planId: string;
	export let token: string;

	let workflows: EvidenceWorkflow[] = [];
	let loading = false;
	let createOpen = false;
	let createTitle = '';
	let createDescription = '';
	let createSubmitting = false;
	let completingStepId: string | null = null;

	export let onRefresh: () => void = () => {};

	$: if (caseId && planId && token) {
		load();
	}

	async function load() {
		if (!caseId || !planId || !token) return;
		loading = true;
		try {
			workflows = await getEvidenceWorkflows(caseId, planId, token);
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Failed to load evidence workflows');
			workflows = [];
		} finally {
			loading = false;
		}
	}

	export { load };

	async function submitCreate() {
		const title = createTitle.trim();
		if (!title) {
			toast.error('Title is required');
			return;
		}
		createSubmitting = true;
		try {
			await createEvidenceWorkflow(caseId, planId, token, {
				title,
				description: createDescription.trim() || undefined
			});
			toast.success('Evidence workflow created');
			createOpen = false;
			createTitle = '';
			createDescription = '';
			load();
			onRefresh();
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Create failed');
		} finally {
			createSubmitting = false;
		}
	}

	async function handleCompleteStep(workflowId: string, stepId: string) {
		completingStepId = stepId;
		try {
			await completeEvidenceWorkflowStep(caseId, workflowId, stepId, token);
			load();
			onRefresh();
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Complete step failed');
		} finally {
			completingStepId = null;
		}
	}
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between">
		<h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Evidence workflows</h3>
		<button
			type="button"
			class="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
			on:click={() => (createOpen = true)}
		>New workflow</button>
	</div>
	{#if loading}
		<p class="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
	{:else if workflows.length === 0}
		<p class="text-sm text-gray-500 dark:text-gray-400">No evidence workflows for this plan.</p>
	{:else}
		<ul class="list-none space-y-4">
			{#each workflows as w (w.id)}
				<li class="border border-gray-200 dark:border-gray-600 rounded p-3">
					<h4 class="text-sm font-medium mb-1">{w.title}</h4>
					{#if w.description}
						<p class="text-xs text-gray-500 dark:text-gray-400 mb-2">{w.description}</p>
					{/if}
					<EvidenceWorkflowSteps
						workflow={w}
						loading={loading}
						onCompleteStep={(stepId) => handleCompleteStep(w.id, stepId)}
						completingStepId={completingStepId}
					/>
				</li>
			{/each}
		</ul>
	{/if}
</div>

{#if createOpen}
	<div class="fixed inset-0 z-10 flex items-center justify-center bg-black/30" role="dialog">
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-sm w-full mx-2">
			<h4 class="font-medium mb-2">New evidence workflow</h4>
			<label class="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Title</label>
			<input
				type="text"
				bind:value={createTitle}
				placeholder="Workflow title"
				class="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm mb-2"
			/>
			<label class="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Description (optional)</label>
			<input
				type="text"
				bind:value={createDescription}
				placeholder="Description"
				class="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm mb-2"
			/>
			<div class="flex gap-2 justify-end">
				<button type="button" class="px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 text-sm" on:click={() => (createOpen = false)}>Cancel</button>
				<button type="button" class="px-2 py-1 rounded bg-blue-600 text-white text-sm disabled:opacity-50" disabled={createSubmitting} on:click={submitCreate}>Create</button>
			</div>
		</div>
	</div>
{/if}
