<script lang="ts">
	/**
	 * P71-08 — Tier L shell / framing (P70-06 S1/W1, P70-04 B); presentation only.
	 */
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { caseEngineToken } from '$lib/stores';
	import CaseWorkspaceContentRegion from '$lib/components/case/CaseWorkspaceContentRegion.svelte';
	import {
		listCaseTimelineEntries,
		listCaseFiles,
		listWorkflowItems,
		listWorkflowProposals,
		listCaseNotebookNotes,
		listProposals,
		type ProposalRecord,
		type WorkflowProposal
	} from '$lib/apis/caseEngine';
	import CaseLoadingState from '$lib/components/case/CaseLoadingState.svelte';
	import CaseEmptyState from '$lib/components/case/CaseEmptyState.svelte';
	import CaseErrorState from '$lib/components/case/CaseErrorState.svelte';
	import {
		formatCaseDateTime,
		formatOperationalCaseDateTime
	} from '$lib/utils/formatDateTime';

	// ── Route-reuse case-switch guard (P28-45) ─────────────────────────────────
	// $: caseId (reactive) instead of const so it updates when SvelteKit reuses
	// this component for a different case. prevLoadedCaseId is seeded to the
	// initial param so the reactive block is a no-op on first render (onMount
	// handles initial load); it fires only on case switch.
	$: caseId = $page.params.id;
	let prevLoadedCaseId: string = $page.params.id ?? '';
	/** Incremented on each load; guards stale responses from writing to the wrong case. */
	let activeLoadId = 0;

	type ActivityType = 'Timeline' | 'Files' | 'Workflow' | 'Proposals' | 'Notes';
	type ActivityItem = {
		id: string;
		type: ActivityType;
		action: string;
		timestamp: string;
		actor: string;
		description: string;
		sourcePath: string;
		occurredAt?: string;
	};

	let items: ActivityItem[] = [];
	let loading = true;
	let loadError = '';
	let filterType: 'All' | ActivityType = 'All';

	$: displayedItems = filterType === 'All' ? items : items.filter((i) => i.type === filterType);

	$: if (caseId && $caseEngineToken && caseId !== prevLoadedCaseId) {
		prevLoadedCaseId = caseId;
		items = [];
		loadError = '';
		filterType = 'All';
		loadActivity();
	}

	function asActor(v: unknown): string {
		const s = typeof v === 'string' ? v.trim() : '';
		return s || 'Unknown user';
	}

	function truncate(v: string, max = 90): string {
		const s = v.trim();
		return s.length <= max ? s : `${s.slice(0, max)}...`;
	}

	function sortNewestFirst(activity: ActivityItem[]): ActivityItem[] {
		return [...activity].sort((a, b) => {
			const tA = Date.parse(a.timestamp);
			const tB = Date.parse(b.timestamp);
			const nA = Number.isNaN(tA) ? 0 : tA;
			const nB = Number.isNaN(tB) ? 0 : tB;
			return nB - nA;
		});
	}

	function mapProposalLifecycleEvents(proposal: ProposalRecord): ActivityItem[] {
		const out: ActivityItem[] = [];
		out.push({
			id: `proposal-create-${proposal.id}`,
			type: 'Proposals',
			action: 'Proposal created',
			timestamp: proposal.created_at,
			actor: asActor(proposal.created_by),
			description: `${proposal.proposal_type} proposal`,
			sourcePath: `/case/${caseId}/proposals`
		});
		if (proposal.status === 'approved' && proposal.reviewed_at && proposal.reviewed_by) {
			out.push({
				id: `proposal-approved-${proposal.id}`,
				type: 'Proposals',
				action: 'Proposal approved',
				timestamp: proposal.reviewed_at,
				actor: asActor(proposal.reviewed_by),
				description: `${proposal.proposal_type} proposal approved`,
				sourcePath: `/case/${caseId}/proposals`
			});
		}
		if (proposal.status === 'rejected' && proposal.reviewed_at && proposal.reviewed_by) {
			out.push({
				id: `proposal-rejected-${proposal.id}`,
				type: 'Proposals',
				action: 'Proposal rejected',
				timestamp: proposal.reviewed_at,
				actor: asActor(proposal.reviewed_by),
				description: `${proposal.proposal_type} proposal rejected`,
				sourcePath: `/case/${caseId}/proposals`
			});
		}
		if (proposal.committed_at) {
			out.push({
				id: `proposal-committed-${proposal.id}`,
				type: 'Proposals',
				action: 'Proposal committed',
				timestamp: proposal.committed_at,
				actor: asActor(proposal.reviewed_by),
				description: `${proposal.proposal_type} proposal committed`,
				sourcePath: `/case/${caseId}/proposals`
			});
		}
		return out;
	}

	function mapWorkflowProposalEvents(proposal: WorkflowProposal): ActivityItem[] {
		const out: ActivityItem[] = [];
		out.push({
			id: `wf-proposal-create-${proposal.id}`,
			type: 'Workflow',
			action: 'Workflow proposal created',
			timestamp: proposal.created_at,
			actor: asActor(proposal.created_by),
			description: proposal.suggested_payload?.title
				? truncate(String(proposal.suggested_payload.title))
				: 'Workflow proposal',
			sourcePath: `/case/${caseId}/workflow`
		});
		if (proposal.resolved_at && proposal.resolved_by) {
			out.push({
				id: `wf-proposal-resolved-${proposal.id}`,
				type: 'Workflow',
				action:
					proposal.status === 'ACCEPTED'
						? 'Workflow proposal accepted'
						: proposal.status === 'REJECTED'
							? 'Workflow proposal rejected'
							: 'Workflow proposal resolved',
				timestamp: proposal.resolved_at,
				actor: asActor(proposal.resolved_by),
				description: proposal.suggested_payload?.title
					? truncate(String(proposal.suggested_payload.title))
					: 'Workflow proposal',
				sourcePath: `/case/${caseId}/workflow`
			});
		}
		return out;
	}

	async function loadActivity(): Promise<void> {
		if (!$caseEngineToken) return;
		activeLoadId += 1;
		const loadId = activeLoadId;
		loading = true;
		loadError = '';
		items = [];
		try {
			const [timeline, files, workflowItems, workflowProposals, notes, proposals] = await Promise.all([
				listCaseTimelineEntries(caseId, $caseEngineToken),
				// Full file list (no pagination) — fine for small cases; large cases may need a dedicated ticket (see P42-02 audit).
				listCaseFiles(caseId, $caseEngineToken),
				listWorkflowItems(caseId, $caseEngineToken),
				listWorkflowProposals(caseId, $caseEngineToken),
				listCaseNotebookNotes(caseId, $caseEngineToken),
				listProposals(caseId, $caseEngineToken)
			]);

			if (loadId !== activeLoadId) return;

			const activity: ActivityItem[] = [];

			for (const entry of timeline) {
				activity.push({
					id: `timeline-${entry.id}`,
					type: 'Timeline',
					action: 'Timeline entry added',
					// Activity feed semantics: when user/system action happened.
					timestamp: entry.created_at,
					actor: asActor(entry.created_by),
					description: truncate(entry.text_original || entry.type || 'Timeline entry'),
					sourcePath: `/case/${caseId}/timeline`,
					occurredAt: entry.occurred_at
				});
			}

			for (const file of files) {
				activity.push({
					id: `file-${file.id}`,
					type: 'Files',
					action: 'File uploaded',
					timestamp: file.uploaded_at,
					actor: asActor(file.uploaded_by),
					description: truncate(file.original_filename || 'Case file'),
					sourcePath: `/case/${caseId}/files`
				});
			}

			for (const wf of workflowItems) {
				activity.push({
					id: `workflow-created-${wf.id}`,
					type: 'Workflow',
					action: 'Workflow item created',
					timestamp: wf.created_at,
					actor: asActor(wf.created_by),
					description: truncate(wf.title || 'Workflow item'),
					sourcePath: `/case/${caseId}/workflow`
				});
				if (wf.updated_at && wf.updated_at !== wf.created_at) {
					activity.push({
						id: `workflow-updated-${wf.id}`,
						type: 'Workflow',
						action: 'Workflow item updated',
						timestamp: wf.updated_at,
						actor: asActor(wf.updated_by ?? wf.created_by),
						description: truncate(wf.title || 'Workflow item'),
						sourcePath: `/case/${caseId}/workflow`
					});
				}
			}

			for (const proposal of workflowProposals) {
				activity.push(...mapWorkflowProposalEvents(proposal));
			}

			for (const note of notes) {
				activity.push({
					id: `note-created-${note.id}`,
					type: 'Notes',
					action: 'Note added',
					timestamp: note.created_at,
					actor: asActor(note.created_by),
					description: truncate(note.title || 'Untitled note'),
					sourcePath: `/case/${caseId}/notes`
				});
				if (note.updated_at && note.updated_at !== note.created_at) {
					activity.push({
						id: `note-updated-${note.id}`,
						type: 'Notes',
						action: 'Note updated',
						timestamp: note.updated_at,
						actor: asActor(note.updated_by),
						description: truncate(note.title || 'Untitled note'),
						sourcePath: `/case/${caseId}/notes`
					});
				}
			}

			for (const proposal of proposals) {
				activity.push(...mapProposalLifecycleEvents(proposal));
			}

			items = sortNewestFirst(activity);
		} catch (e: unknown) {
			if (loadId !== activeLoadId) return;
			loadError = e instanceof Error ? e.message : 'Failed to load activity';
		} finally {
			if (loadId === activeLoadId) loading = false;
		}
	}

	onMount(() => { loadActivity(); });
	function typeBadgeClass(type: ActivityType): string {
		if (type === 'Timeline') return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
		if (type === 'Files') return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';
		if (type === 'Workflow') return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400';
		if (type === 'Proposals') return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
		return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300';
	}
</script>

<CaseWorkspaceContentRegion testId="case-activity-page">
<div class="ce-l-activity-shell">
	<div class="ce-l-activity-hero">
		<h2 class="ce-l-activity-hero-title text-sm font-semibold">Activity</h2>
		<span class="text-xs ce-l-activity-hero-meta">Read-only case history, newest first</span>
		<span class="text-xs ce-l-activity-hero-meta">
			Recorded events only; review chronology here, make changes in source tabs.
		</span>
		{#if items.length > 0}
			<label class="ml-auto flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
				<span>Type</span>
				<select
					class="rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs py-1 px-2"
					bind:value={filterType}
				>
					<option value="All">All</option>
					<option value="Timeline">Timeline</option>
					<option value="Files">Files</option>
					<option value="Workflow">Workflow</option>
					<option value="Notes">Notes</option>
					<option value="Proposals">Proposals</option>
				</select>
			</label>
		{/if}
		<button
			type="button"
			class="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition"
			on:click={() => loadActivity()}
			title="Refresh activity"
		>
			Refresh
		</button>
	</div>

	<div class="ce-l-activity-primary-scroll px-4 pt-3 pb-4" data-testid="case-activity-primary-scroll">
		{#if loading}
			<CaseLoadingState label="Loading activity..." testId="case-activity-loading" />
		{:else if loadError}
			<CaseErrorState message={loadError} />
		{:else if items.length === 0}
			<CaseEmptyState
				title="No activity recorded for this case."
				description=""
				testId="case-activity-empty"
			/>
		{:else if displayedItems.length === 0}
			<CaseEmptyState
				title="No activity matches this filter."
				description='Select "All" to view all activity.'
			/>
		{:else}
			<ol class="flex flex-col gap-px" data-testid="case-activity-list" aria-label="Case activity feed">
				{#each displayedItems as item (item.id)}
					<li
						class="py-3 px-3 border-b border-gray-100 dark:border-gray-800/80 last:border-0 rounded-sm hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
						data-testid="case-activity-item"
					>
						<div class="flex flex-wrap items-center gap-2 min-w-0">
							<time datetime={item.timestamp} class="text-xs font-medium text-gray-600 dark:text-gray-300">
								{formatCaseDateTime(item.timestamp)}
							</time>
							<span class="text-gray-300 dark:text-gray-600" aria-hidden="true">·</span>
							<span class="shrink-0 text-xs font-medium px-1.5 py-0.5 rounded whitespace-nowrap {typeBadgeClass(item.type)}">
								{item.type}
							</span>
							<span class="text-xs text-gray-700 dark:text-gray-200">{item.action}</span>
						</div>
						<div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
							{item.description}
						</div>
						{#if item.type === 'Timeline' && item.occurredAt}
							<div class="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
								Occurred: {formatOperationalCaseDateTime(item.occurredAt)}
							</div>
						{/if}
						<div class="mt-1 text-xs text-gray-400 dark:text-gray-500 flex items-center gap-2">
							<span>by {item.actor}</span>
							<span class="text-gray-300 dark:text-gray-600" aria-hidden="true">·</span>
							<a href={item.sourcePath} class="hover:underline">Open source</a>
						</div>
					</li>
				{/each}
			</ol>
		{/if}
	</div>
</div>
</CaseWorkspaceContentRegion>
