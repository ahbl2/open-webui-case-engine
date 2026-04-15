<!--
	P132.5-04 — Left rail composition: case meta (from layout props) + entities + workflow + demoted section nav.
	Composition only: child panels perform their own reads; this file has no Case Engine API imports.
-->
<script lang="ts">
	import type { CaseMeta } from '$lib/stores/caseEngine';
	import {
		DS_BADGE_CLASSES,
		DS_CHIP_CLASSES,
		DS_TYPE_CLASSES,
		DS_WORKSPACE_SHELL_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import { displayCaseTitle, caseStatusDsBadgeCompound } from '$lib/utils/caseIdentityStrip';
	import {
		P1325_LEFT_STACK_META_LABEL_NUMBER,
		P1325_LEFT_STACK_META_LABEL_STATUS,
		P1325_LEFT_STACK_META_LABEL_TITLE,
		P1325_LEFT_STACK_META_LABEL_UNIT,
		P1325_LEFT_STACK_SECTION_CASE_CONTEXT
	} from '$lib/caseContext/p1325CaseWorkspaceShellCopy';
	import CaseEntitiesPanel from '$lib/components/case/CaseEntitiesPanel.svelte';
	import CaseCaseWorkflowItemsPanel from '$lib/components/case/CaseCaseWorkflowItemsPanel.svelte';
	import CaseWorkspaceCaseSidebar from '$lib/components/case/CaseWorkspaceCaseSidebar.svelte';

	export let caseId: string;
	export let caseEngineToken: string;
	export let meta: CaseMeta | null;
	/** True while layout `loadCaseMeta` is in progress without usable meta yet. */
	export let shellLoading = false;
</script>

<div
	class="flex min-h-0 min-w-0 flex-1 flex-col gap-3"
	data-testid="case-workspace-left-panel-stack"
	data-p1325-left-stack="true"
>
	<section
		class="shrink-0 space-y-1.5 p-2 {DS_WORKSPACE_SHELL_CLASSES.leftStackInset}"
		data-testid="p1325-left-stack--case-context"
		aria-labelledby="p1325-left-stack-case-context-h"
	>
		<h2
			id="p1325-left-stack-case-context-h"
			class="{DS_TYPE_CLASSES.label} m-0 text-[color:var(--ce-l-text-muted)]"
		>
			{P1325_LEFT_STACK_SECTION_CASE_CONTEXT}
		</h2>
		{#if shellLoading && !meta}
			<p
				class="m-0 animate-pulse text-xs text-[color:var(--ce-l-text-muted)]"
				data-testid="p1325-left-stack--case-context-loading"
			>
				Loading…
			</p>
		{:else if !meta}
			<p class="m-0 text-xs text-[color:var(--ce-l-text-muted)]" data-testid="p1325-left-stack--case-context-empty">—</p>
		{:else}
			<dl class="m-0 grid min-w-0 grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-2 gap-y-1.5 text-xs">
				<dt class="m-0 shrink-0 text-[color:var(--ce-l-text-muted)]">{P1325_LEFT_STACK_META_LABEL_NUMBER}</dt>
				<dd
					class="{DS_TYPE_CLASSES.mono} m-0 min-w-0 tabular-nums text-[color:var(--ce-l-text-secondary)]"
					data-testid="p1325-left-stack--case-number"
				>
					{meta.case_number}
				</dd>
				<dt class="m-0 shrink-0 text-[color:var(--ce-l-text-muted)]">{P1325_LEFT_STACK_META_LABEL_TITLE}</dt>
				<dd class="m-0 min-w-0 truncate text-[color:var(--ce-l-text-primary)]" title={displayCaseTitle(meta.title)}>
					{displayCaseTitle(meta.title)}
				</dd>
				<dt class="m-0 shrink-0 text-[color:var(--ce-l-text-muted)]">{P1325_LEFT_STACK_META_LABEL_UNIT}</dt>
				<dd class="m-0 min-w-0">
					{#if meta.unit?.trim()}
						<span class="{DS_CHIP_CLASSES.base} max-w-full truncate" title={meta.unit}>{meta.unit}</span>
					{:else}
						<span class="text-[color:var(--ce-l-text-muted)]">—</span>
					{/if}
				</dd>
				<dt class="m-0 shrink-0 text-[color:var(--ce-l-text-muted)]">{P1325_LEFT_STACK_META_LABEL_STATUS}</dt>
				<dd class="m-0 min-w-0">
					{#if meta.status?.trim()}
						<span class={caseStatusDsBadgeCompound(meta.status)} data-testid="p1325-left-stack--case-status">{meta.status}</span>
					{:else}
						<span class="{DS_BADGE_CLASSES.base} {DS_BADGE_CLASSES.neutral}">No status</span>
					{/if}
				</dd>
			</dl>
		{/if}
	</section>

	<div class="min-h-0 shrink-0" data-testid="p1325-left-stack--entities-wrap">
		<CaseEntitiesPanel {caseId} {caseEngineToken} compactRail={true} />
	</div>

	<div class="min-h-0 shrink-0" data-testid="p1325-left-stack--workflow-wrap">
		<CaseCaseWorkflowItemsPanel {caseId} {caseEngineToken} railCompact={true} />
	</div>

	<div
		class="shrink-0 border-t border-[color:var(--ce-l-border-subtle)] pt-2"
		data-testid="p1325-left-stack--nav-secondary"
	>
		<CaseWorkspaceCaseSidebar showCaseList={false} layoutVariant="embedded" />
	</div>
</div>
