<!--
	P132.5-03 — Activity / AI Workspace / Proposals in the shell right rail, internal tabs only (no URL or route changes).
	Composition-only: delegates to the same surfaces as the standalone case tab routes.
-->
<script lang="ts">
	import { caseEngineToken } from '$lib/stores';
	import CaseActivityFraming from '$lib/components/case/CaseActivityFraming.svelte';
	import CaseActivityList from '$lib/components/case/CaseActivityList.svelte';
	import AIWorkspacePanel from '$lib/components/case/AIWorkspacePanel.svelte';
	import ProposalReviewPanel from '$lib/components/proposals/ProposalReviewPanel.svelte';
	import CaseProposalFraming from '$lib/components/case/CaseProposalFraming.svelte';
	import {
		DS_BANNER_CLASSES,
		DS_STATUS_SURFACE_CLASSES,
		DS_STATUS_TEXT_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import { P129_ACTIVITY_LIST_NO_TOKEN } from '$lib/caseContext/p129ActivityListCopy';
	import {
		P1325_RIGHT_STACK_TABLIST_LABEL,
		P1325_RIGHT_STACK_TAB_ACTIVITY,
		P1325_RIGHT_STACK_TAB_AI,
		P1325_RIGHT_STACK_TAB_PROPOSALS
	} from '$lib/caseContext/p1325CaseWorkspaceShellCopy';
	import { P129_NAV_TITLE_ACTIVITY } from '$lib/caseContext/p129ActivityFramingCopy';
	import { P130_NAV_TITLE_AI_WORKSPACE } from '$lib/caseContext/p130AIWorkspaceCopy';
	import { P128_HEADER_PENDING_PROPOSALS_LINK_TITLE } from '$lib/caseContext/p128ProposalFramingCopy';

	export let caseId: string;

	type RightStackTab = 'activity' | 'ai-workspace' | 'proposals';

	let selected: RightStackTab = 'activity';

	const tabs: { id: RightStackTab; label: string; title: string }[] = [
		{ id: 'activity', label: P1325_RIGHT_STACK_TAB_ACTIVITY, title: P129_NAV_TITLE_ACTIVITY },
		{ id: 'ai-workspace', label: P1325_RIGHT_STACK_TAB_AI, title: P130_NAV_TITLE_AI_WORKSPACE },
		{
			id: 'proposals',
			label: P1325_RIGHT_STACK_TAB_PROPOSALS,
			title: P128_HEADER_PENDING_PROPOSALS_LINK_TITLE
		}
	];
</script>

<div
	class="flex min-h-0 flex-1 flex-col overflow-hidden"
	data-testid="case-workspace-right-panel-stack"
	data-region="case-workspace-right-panel-stack"
	data-p1325-right-stack-selected={selected}
>
	<div
		class="flex shrink-0 flex-wrap gap-1 border-b border-[color:var(--ce-l-border-subtle)] px-1 pb-1"
		role="tablist"
		aria-label={P1325_RIGHT_STACK_TABLIST_LABEL}
		data-testid="case-workspace-right-stack-tablist"
	>
		{#each tabs as t (t.id)}
			<button
				type="button"
				role="tab"
				aria-selected={selected === t.id}
				class="ce-l-tab-link ce-l-case-nav-link max-w-full truncate px-1.5 py-1 text-xs {selected === t.id
					? 'ce-l-tab-link--active'
					: ''}"
				title={t.title}
				data-testid="case-workspace-right-stack-tab-{t.id}"
				on:click={() => (selected = t.id)}
			>
				{t.label}
			</button>
		{/each}
	</div>

	<div class="min-h-0 flex-1 overflow-hidden flex flex-col" role="tabpanel" data-testid="case-workspace-right-stack-panel">
		{#if selected === 'activity'}
			<div
				class="ce-l-activity-shell flex min-h-0 flex-1 flex-col overflow-hidden"
				data-route-case-id={caseId || undefined}
				data-testid="case-workspace-right-stack-activity"
			>
				<CaseActivityFraming />
				<div
					class="ce-l-activity-primary-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pt-2 pb-2"
					data-testid="case-workspace-right-stack-activity-scroll"
					data-region="case-activity-primary-scroll"
				>
					{#if !$caseEngineToken}
						<div class="min-h-0 flex-1" data-testid="case-activity-no-token">
							<div
								class="{DS_BANNER_CLASSES.base} {DS_BANNER_CLASSES.denseModifier} border border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-raised)] p-3"
							>
								<p class="{DS_BANNER_CLASSES.body} m-0 text-xs text-[color:var(--ce-l-text-primary)]">
									{P129_ACTIVITY_LIST_NO_TOKEN}
								</p>
							</div>
						</div>
					{:else}
						<CaseActivityList caseId={caseId} />
					{/if}
				</div>
			</div>
		{:else if selected === 'ai-workspace'}
			<div
				class="flex min-h-0 flex-1 flex-col overflow-y-auto"
				data-testid="case-workspace-right-stack-ai-workspace"
			>
				<AIWorkspacePanel caseId={caseId} />
			</div>
		{:else}
			<div
				class="flex min-h-0 flex-1 flex-col overflow-hidden"
				data-testid="case-workspace-right-stack-proposals"
			>
				<CaseProposalFraming />
				<div class="ce-l-proposals-shell min-h-0 flex-1 overflow-y-auto">
					<div class="ce-l-proposals-workspace px-1.5 pb-2 sm:px-2">
						{#if $caseEngineToken && caseId}
							<ProposalReviewPanel
								caseId={caseId}
								token={$caseEngineToken}
								layout="compact"
								reviewActionsEnabled={true}
								p128SingleReviewMode={true}
								refreshOnNav={true}
							/>
						{:else}
							<div
								class="{DS_BANNER_CLASSES.base} {DS_BANNER_CLASSES.denseModifier} {DS_STATUS_SURFACE_CLASSES.warning} m-2 p-4"
							>
								<p class="{DS_BANNER_CLASSES.body} m-0 text-sm {DS_STATUS_TEXT_CLASSES.warning}">
									Case Engine connection required to load proposals for this case.
								</p>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
