<!--
	P131-01 — Operator Command Center: identity + framing.
	P131-02 — Cross-case case list (GET-only) lives in CommandCenterCaseList.
	P131-03 — Cross-case activity feed (GET-only) lives in CommandCenterActivityFeed.
	P131-04 — Workflow snapshot (GET-only) lives in CommandCenterWorkflowSnapshot.
	P131.5-01 — Dashboard grid shell + `CommandCenterDashboardCard` wrappers.
	P131.5-02 — Single bundle fetch + summary metrics (explicit counts only).
-->
<script lang="ts">
	import { browser } from '$app/environment';
	import CommandCenterActivityFeed from '$lib/components/operator/CommandCenterActivityFeed.svelte';
	import CommandCenterCaseList from '$lib/components/operator/CommandCenterCaseList.svelte';
	import CommandCenterWorkflowSnapshot from '$lib/components/operator/CommandCenterWorkflowSnapshot.svelte';
	import CommandCenterDashboardCard from '$lib/components/operator/CommandCenterDashboardCard.svelte';
	import CommandCenterSummaryMetricCard from '$lib/components/operator/CommandCenterSummaryMetricCard.svelte';
	import type { CommandCenterActivityRow } from '$lib/case/commandCenterActivity';
	import { loadCommandCenterDashboardBundle } from '$lib/case/commandCenterBundle';
	import type { CommandCenterCaseRow } from '$lib/case/commandCenterCases';
	import type { CommandCenterWorkflowRow } from '$lib/case/commandCenterWorkflow';
	import {
		countActivityRows,
		countCasesInScope,
		countOpenCases,
		sumWorkflowItemCounts
	} from '$lib/case/commandCenterSummary';
	import { DS_BANNER_CLASSES, DS_TYPE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import {
		P131_5_COMMAND_CENTER_SUMMARY_ACTIVITY_SUB,
		P131_5_COMMAND_CENTER_SUMMARY_ACTIVITY_TITLE,
		P131_5_COMMAND_CENTER_SUMMARY_CASES_SUB,
		P131_5_COMMAND_CENTER_SUMMARY_CASES_TITLE,
		P131_5_COMMAND_CENTER_SUMMARY_NO_TOKEN_SUB,
		P131_5_COMMAND_CENTER_SUMMARY_OPEN_SUB,
		P131_5_COMMAND_CENTER_SUMMARY_OPEN_TITLE,
		P131_5_COMMAND_CENTER_SUMMARY_WORKFLOW_SUB,
		P131_5_COMMAND_CENTER_SUMMARY_WORKFLOW_TITLE,
		P131_5_COMMAND_CENTER_ACTIVITY_CARD_SUB,
		P131_5_COMMAND_CENTER_ACTIVITY_CARD_TITLE,
		P131_5_COMMAND_CENTER_CASES_CARD_SUB,
		P131_5_COMMAND_CENTER_CASES_CARD_TITLE,
		P131_5_COMMAND_CENTER_WORKFLOW_CARD_SUB,
		P131_5_COMMAND_CENTER_WORKFLOW_CARD_TITLE,
		P131_COMMAND_CENTER_BOUNDARY_NO_ACTIONS,
		P131_COMMAND_CENTER_BOUNDARY_NOT_TRUTH,
		P131_COMMAND_CENTER_BOUNDARY_TIMELINE,
		P131_COMMAND_CENTER_CORE_PRINCIPLE,
		P131_COMMAND_CENTER_INTRO_CROSS_CASE,
		P131_COMMAND_CENTER_INTRO_NO_MUTATION,
		P131_COMMAND_CENTER_INTRO_READ_ONLY,
		P131_COMMAND_CENTER_SURFACE_TITLE
	} from '$lib/case/p131CommandCenterCopy';
	import { caseEngineToken, caseEngineUser, unitFilter } from '$lib/stores';

	let caseRows: CommandCenterCaseRow[] = [];
	let caseLoading = false;
	let caseLoadError: string | null = null;

	let activityRows: CommandCenterActivityRow[] = [];
	let activityLoading = false;
	let activityLoadError: string | null = null;

	let workflowRows: CommandCenterWorkflowRow[] = [];
	let workflowLoading = false;
	let workflowLoadError: string | null = null;

	let loadBundleKeyPrev = '';

	async function loadCommandCenterBundle(): Promise<void> {
		const token = $caseEngineToken;
		if (!token) {
			caseRows = [];
			activityRows = [];
			workflowRows = [];
			caseLoadError = null;
			activityLoadError = null;
			workflowLoadError = null;
			caseLoading = false;
			activityLoading = false;
			workflowLoading = false;
			return;
		}
		const unit = $unitFilter ?? 'ALL';
		caseLoading = true;
		activityLoading = true;
		workflowLoading = true;
		caseLoadError = null;
		activityLoadError = null;
		workflowLoadError = null;
		caseRows = [];
		activityRows = [];
		workflowRows = [];

		const bundle = await loadCommandCenterDashboardBundle(token, unit);
		caseRows = bundle.caseRows;
		activityRows = bundle.activityRows;
		workflowRows = bundle.workflowRows;
		caseLoadError = bundle.caseLoadError;
		activityLoadError = bundle.activityLoadError;
		workflowLoadError = bundle.workflowLoadError;

		caseLoading = false;
		activityLoading = false;
		workflowLoading = false;
	}

	$: if (browser) {
		const k = `${$caseEngineToken ?? ''}|${$unitFilter ?? ''}|${$caseEngineUser?.id ?? ''}`;
		if (k !== loadBundleKeyPrev) {
			loadBundleKeyPrev = k;
			void loadCommandCenterBundle();
		}
	}

	$: hasToken = !!$caseEngineToken;
	$: summaryCasesCount = countCasesInScope(caseRows);
	$: summaryOpenCount = countOpenCases(caseRows);
	$: summaryActivityCount = countActivityRows(activityRows);
	$: summaryWorkflowSum = sumWorkflowItemCounts(workflowRows);
</script>

<div
	class="ce-l-command-center flex min-h-0 flex-1 flex-col overflow-hidden border-l-4 border-slate-500/50 bg-[color:var(--ce-l-surface-raised)]"
	data-testid="command-center-panel"
	data-p131-command-center="true"
	data-p131-command-center-readonly="true"
>
	<section
		class="{DS_BANNER_CLASSES.base} {DS_BANNER_CLASSES.denseModifier} shrink-0 border-b border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-muted)] px-3 py-3 sm:px-4"
		aria-labelledby="command-center-p131-title"
		data-testid="command-center-framing"
	>
		<h1
			id="command-center-p131-title"
			class="{DS_TYPE_CLASSES.section} m-0 text-sm font-semibold text-[color:var(--ce-l-text-primary)]"
		>
			{P131_COMMAND_CENTER_SURFACE_TITLE}
		</h1>
		<p class="{DS_BANNER_CLASSES.body} m-0 mt-2 text-xs leading-snug text-[color:var(--ce-l-text-muted)]">
			{P131_COMMAND_CENTER_INTRO_CROSS_CASE}
		</p>
		<p class="{DS_BANNER_CLASSES.body} m-0 mt-2 text-xs leading-snug text-[color:var(--ce-l-text-muted)]">
			{P131_COMMAND_CENTER_INTRO_READ_ONLY}
		</p>
		<p class="{DS_BANNER_CLASSES.body} m-0 mt-2 text-xs leading-snug text-[color:var(--ce-l-text-muted)]">
			{P131_COMMAND_CENTER_INTRO_NO_MUTATION}
		</p>
		<p
			class="{DS_TYPE_CLASSES.body} m-0 mt-3 border-t border-[color:var(--ce-l-border-default)] pt-3 text-xs font-medium text-[color:var(--ce-l-text-primary)]"
		>
			{P131_COMMAND_CENTER_CORE_PRINCIPLE}
		</p>
		<p class="{DS_BANNER_CLASSES.body} m-0 mt-2 text-xs leading-snug text-[color:var(--ce-l-text-muted)]">
			{P131_COMMAND_CENTER_BOUNDARY_TIMELINE}
		</p>
		<p class="{DS_BANNER_CLASSES.body} m-0 mt-2 text-xs leading-snug text-[color:var(--ce-l-text-muted)]">
			{P131_COMMAND_CENTER_BOUNDARY_NOT_TRUTH}
		</p>
		<p class="{DS_BANNER_CLASSES.body} m-0 mt-2 text-xs leading-snug text-[color:var(--ce-l-text-muted)]">
			{P131_COMMAND_CENTER_BOUNDARY_NO_ACTIONS}
		</p>
	</section>

	<div
		class="command-center-dashboard-grid grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto bg-[color:var(--ce-l-canvas)] px-3 py-4 pb-5 sm:px-4 lg:grid-cols-12 lg:gap-5 lg:px-5"
		data-testid="command-center-primary-scroll"
		data-region="command-center-primary-scroll"
		data-p131-5-dashboard-grid="true"
		data-p131-5-dashboard-canvas="true"
	>
		<CommandCenterSummaryMetricCard
			title={P131_5_COMMAND_CENTER_SUMMARY_CASES_TITLE}
			subtitle={hasToken ? P131_5_COMMAND_CENTER_SUMMARY_CASES_SUB : P131_5_COMMAND_CENTER_SUMMARY_NO_TOKEN_SUB}
			testId="command-center-summary-cases-in-scope"
			headerIcon="folder"
			hasToken={hasToken}
			loading={caseLoading}
			loadError={caseLoadError}
			value={summaryCasesCount}
		/>
		<CommandCenterSummaryMetricCard
			title={P131_5_COMMAND_CENTER_SUMMARY_ACTIVITY_TITLE}
			subtitle={hasToken ? P131_5_COMMAND_CENTER_SUMMARY_ACTIVITY_SUB : P131_5_COMMAND_CENTER_SUMMARY_NO_TOKEN_SUB}
			testId="command-center-summary-activity-rows"
			headerIcon="clock"
			hasToken={hasToken}
			loading={activityLoading}
			loadError={activityLoadError}
			value={summaryActivityCount}
		/>
		<CommandCenterSummaryMetricCard
			title={P131_5_COMMAND_CENTER_SUMMARY_WORKFLOW_TITLE}
			subtitle={hasToken ? P131_5_COMMAND_CENTER_SUMMARY_WORKFLOW_SUB : P131_5_COMMAND_CENTER_SUMMARY_NO_TOKEN_SUB}
			testId="command-center-summary-workflow-items"
			headerIcon="list"
			hasToken={hasToken}
			loading={workflowLoading}
			loadError={workflowLoadError}
			value={summaryWorkflowSum}
		/>
		<CommandCenterSummaryMetricCard
			title={P131_5_COMMAND_CENTER_SUMMARY_OPEN_TITLE}
			subtitle={hasToken ? P131_5_COMMAND_CENTER_SUMMARY_OPEN_SUB : P131_5_COMMAND_CENTER_SUMMARY_NO_TOKEN_SUB}
			testId="command-center-summary-open-cases"
			headerIcon="circle"
			hasToken={hasToken}
			loading={caseLoading}
			loadError={caseLoadError}
			value={summaryOpenCount}
		/>

		<CommandCenterDashboardCard
			title={P131_5_COMMAND_CENTER_CASES_CARD_TITLE}
			subtitle={P131_5_COMMAND_CENTER_CASES_CARD_SUB}
			testId="command-center-dashboard-card-case-list"
			variant="primary"
			headerIcon="folder"
			gridClass="min-h-0 lg:col-span-8 lg:min-h-[min(70vh,36rem)]"
		>
			<CommandCenterCaseList
				dataSource="parent"
				parentRows={caseRows}
				parentLoading={caseLoading}
				parentLoadError={caseLoadError}
			/>
		</CommandCenterDashboardCard>

		<CommandCenterDashboardCard
			title={P131_5_COMMAND_CENTER_ACTIVITY_CARD_TITLE}
			subtitle={P131_5_COMMAND_CENTER_ACTIVITY_CARD_SUB}
			testId="command-center-dashboard-card-activity"
			variant="secondary"
			headerIcon="clock"
			gridClass="min-h-0 lg:col-span-4 lg:min-h-[min(70vh,36rem)]"
		>
			<CommandCenterActivityFeed
				dataSource="parent"
				parentRows={activityRows}
				parentLoading={activityLoading}
				parentLoadError={activityLoadError}
			/>
		</CommandCenterDashboardCard>

		<CommandCenterDashboardCard
			title={P131_5_COMMAND_CENTER_WORKFLOW_CARD_TITLE}
			subtitle={P131_5_COMMAND_CENTER_WORKFLOW_CARD_SUB}
			testId="command-center-dashboard-card-workflow"
			variant="secondary"
			headerIcon="list"
			gridClass="min-h-0 lg:col-span-12 lg:min-h-[min(48vh,28rem)]"
		>
			<CommandCenterWorkflowSnapshot
				dataSource="parent"
				parentRows={workflowRows}
				parentLoading={workflowLoading}
				parentLoadError={workflowLoadError}
			/>
		</CommandCenterDashboardCard>
	</div>
</div>
