<!--
	P130-01 — AI Workspace identity + framing (non-authoritative assistant layer).
	P130-02 — Read-only case retrieval on explicit user action (GET-only bundle; no LLM).
-->
<script lang="ts">
	import { activeCaseMeta, caseEngineToken } from '$lib/stores';
	import { buildCaseRetrievalBundle } from '$lib/case/caseDataIngestion';
	import type { CaseRetrievalBundle } from '$lib/case/caseRetrievalBundleTypes';
	import {
		DS_BANNER_CLASSES,
		DS_PANEL_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import {
		P130_AI_WORKSPACE_BOUNDARY_AI,
		P130_AI_WORKSPACE_BOUNDARY_PROPOSALS,
		P130_AI_WORKSPACE_BOUNDARY_TIMELINE,
		P130_AI_WORKSPACE_CASE_CONTEXT_HEADING,
		P130_AI_WORKSPACE_CORE_PRINCIPLE,
		P130_AI_WORKSPACE_DATA_USED_ENTITIES,
		P130_AI_WORKSPACE_DATA_USED_FILES,
		P130_AI_WORKSPACE_DATA_USED_NOTES,
		P130_AI_WORKSPACE_DATA_USED_SECTION_INTRO,
		P130_AI_WORKSPACE_DATA_USED_SECTION_TITLE,
		P130_AI_WORKSPACE_DATA_USED_TIMELINE,
		P130_AI_WORKSPACE_DATA_USED_WORKFLOW,
		P130_AI_WORKSPACE_INGESTING_LABEL,
		P130_AI_WORKSPACE_INGESTION_SUCCESS,
		P130_AI_WORKSPACE_INPUT_LABEL,
		P130_AI_WORKSPACE_INPUT_PLACEHOLDER,
		P130_AI_WORKSPACE_OUTPUT_EMPTY,
		P130_AI_WORKSPACE_OUTPUT_REGION_LABEL,
		P130_AI_WORKSPACE_ROLE_ASSISTANT,
		P130_AI_WORKSPACE_ROLE_NO_MUTATION,
		P130_AI_WORKSPACE_ROLE_NO_TIMELINE_WRITE,
		P130_AI_WORKSPACE_ROLE_REVIEW,
		P130_AI_WORKSPACE_SCOPE_LABEL,
		P130_AI_WORKSPACE_SEND_DISABLED_TITLE,
		P130_AI_WORKSPACE_SEND_RETRIEVE_BUTTON,
		P130_AI_WORKSPACE_SEND_RETRIEVE_TITLE,
		P130_AI_WORKSPACE_SESSION_LINE_1,
		P130_AI_WORKSPACE_SESSION_LINE_2,
		P130_AI_WORKSPACE_SESSION_LINE_3,
		P130_AI_WORKSPACE_SOURCES_TRACE_BODY,
		P130_AI_WORKSPACE_SOURCES_TRACE_TITLE,
		P130_AI_WORKSPACE_SURFACE_TITLE
	} from '$lib/caseContext/p130AIWorkspaceCopy';

	/** Route case id from `/case/:id/ai-workspace` (display fallback if meta not loaded). */
	export let caseId: string;

	let bundle: CaseRetrievalBundle | null = null;
	let ingestionError: string | null = null;
	let ingesting = false;

	function preventSubmit(e: Event) {
		e.preventDefault();
	}

	async function runRetrieval() {
		const cid = String(caseId ?? '').trim();
		const token = $caseEngineToken;
		if (!cid || !token) {
			ingestionError = 'case_id or token missing — retrieval blocked.';
			bundle = null;
			return;
		}
		ingestionError = null;
		ingesting = true;
		bundle = null;
		try {
			bundle = await buildCaseRetrievalBundle(cid, token);
		} catch (e: unknown) {
			ingestionError = e instanceof Error ? e.message : String(e);
			bundle = null;
		} finally {
			ingesting = false;
		}
	}

	$: caseNumberLabel = ($activeCaseMeta?.case_number ?? '').trim() || caseId || '—';
	$: caseTitleLabel = ($activeCaseMeta?.title ?? '').trim() || '—';
	$: canRetrieve = Boolean(String(caseId ?? '').trim() && $caseEngineToken);
</script>

<div
	class="ce-l-ai-workspace flex min-h-0 flex-1 flex-col overflow-hidden border-l-4 border-violet-600/90 bg-[color:var(--ce-l-surface-raised)]"
	data-testid="case-ai-workspace-panel"
	data-p130-ai-workspace="true"
	data-route-case-id={caseId || undefined}
>
	<!-- P130-01 — Persistent framing (non-dismissible). -->
	<section
		class="{DS_BANNER_CLASSES.base} {DS_BANNER_CLASSES.denseModifier} shrink-0 border-b border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-muted)] px-3 py-3 sm:px-4"
		aria-labelledby="case-ai-workspace-p130-title"
		data-testid="case-ai-workspace-framing"
	>
		<h2
			id="case-ai-workspace-p130-title"
			class="{DS_TYPE_CLASSES.section} m-0 text-sm font-semibold text-[color:var(--ce-l-text-primary)]"
		>
			{P130_AI_WORKSPACE_SURFACE_TITLE}
		</h2>
		<p class="{DS_BANNER_CLASSES.body} m-0 mt-2 text-xs leading-snug text-[color:var(--ce-l-text-muted)]">
			{P130_AI_WORKSPACE_ROLE_ASSISTANT}
		</p>
		<p class="{DS_BANNER_CLASSES.body} m-0 mt-2 text-xs leading-snug text-[color:var(--ce-l-text-muted)]">
			{P130_AI_WORKSPACE_ROLE_NO_MUTATION}
		</p>
		<p class="{DS_BANNER_CLASSES.body} m-0 mt-2 text-xs leading-snug text-[color:var(--ce-l-text-muted)]">
			{P130_AI_WORKSPACE_ROLE_REVIEW}
		</p>
		<p class="{DS_BANNER_CLASSES.body} m-0 mt-2 text-xs leading-snug text-[color:var(--ce-l-text-muted)]">
			{P130_AI_WORKSPACE_ROLE_NO_TIMELINE_WRITE}
		</p>
		<p
			class="{DS_TYPE_CLASSES.body} m-0 mt-3 border-t border-[color:var(--ce-l-border-default)] pt-3 text-xs font-medium text-[color:var(--ce-l-text-primary)]"
		>
			{P130_AI_WORKSPACE_CORE_PRINCIPLE}
		</p>
		<p class="{DS_BANNER_CLASSES.body} m-0 mt-2 text-xs leading-snug text-[color:var(--ce-l-text-muted)]">
			{P130_AI_WORKSPACE_BOUNDARY_TIMELINE}
		</p>
		<p class="{DS_BANNER_CLASSES.body} m-0 mt-2 text-xs leading-snug text-[color:var(--ce-l-text-muted)]">
			{P130_AI_WORKSPACE_BOUNDARY_AI}
		</p>
		<p class="{DS_BANNER_CLASSES.body} m-0 mt-2 text-xs leading-snug text-[color:var(--ce-l-text-muted)]">
			{P130_AI_WORKSPACE_BOUNDARY_PROPOSALS}
		</p>
	</section>

	<div
		class="ce-l-ai-workspace-primary-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3 pb-4 sm:px-4"
		data-testid="case-ai-workspace-primary-scroll"
		data-region="case-ai-workspace-primary-scroll"
	>
		<section
			class="{DS_PANEL_CLASSES.muted} border border-[color:var(--ce-l-border-default)] p-3"
			aria-label={P130_AI_WORKSPACE_CASE_CONTEXT_HEADING}
			data-testid="case-ai-workspace-case-context"
		>
			<h3 class="{DS_TYPE_CLASSES.label} m-0 text-[color:var(--ce-l-text-secondary)]">
				{P130_AI_WORKSPACE_CASE_CONTEXT_HEADING}
			</h3>
			<p class="{DS_TYPE_CLASSES.meta} m-0 mt-1 text-[color:var(--ce-l-text-muted)]">
				<span class="font-medium text-[color:var(--ce-l-text-primary)]">{P130_AI_WORKSPACE_SCOPE_LABEL}</span>
				<span class="mx-1 text-[color:var(--ce-l-text-muted)]">·</span>
				<span class="tabular-nums" data-testid="case-ai-workspace-case-number">{caseNumberLabel}</span>
			</p>
			<p
				class="{DS_TYPE_CLASSES.body} m-0 mt-1 text-sm text-[color:var(--ce-l-text-primary)]"
				data-testid="case-ai-workspace-case-title"
			>
				{caseTitleLabel}
			</p>
		</section>

		<section
			class="rounded border border-dashed border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-muted)] p-3"
			aria-label="Session boundaries"
			data-testid="case-ai-workspace-session-framing"
		>
			<p class="{DS_TYPE_CLASSES.meta} m-0 text-[color:var(--ce-l-text-muted)]">
				{P130_AI_WORKSPACE_SESSION_LINE_1}
			</p>
			<p class="{DS_TYPE_CLASSES.meta} m-0 mt-1 text-[color:var(--ce-l-text-muted)]">
				{P130_AI_WORKSPACE_SESSION_LINE_2}
			</p>
			<p class="{DS_TYPE_CLASSES.meta} m-0 mt-1 text-[color:var(--ce-l-text-muted)]">
				{P130_AI_WORKSPACE_SESSION_LINE_3}
			</p>
		</section>

		<form data-testid="case-ai-workspace-stub-form" on:submit={preventSubmit}>
			<label
				class="flex flex-col gap-1"
				for="case-ai-workspace-prompt-input"
			>
				<span class="{DS_TYPE_CLASSES.label} text-[color:var(--ce-l-text-secondary)]"
					>{P130_AI_WORKSPACE_INPUT_LABEL}</span
				>
				<textarea
					id="case-ai-workspace-prompt-input"
					class="min-h-[6rem] w-full resize-y rounded border border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-raised)] px-2 py-1.5 text-sm text-[color:var(--ce-l-text-primary)]"
					placeholder={P130_AI_WORKSPACE_INPUT_PLACEHOLDER}
					data-testid="case-ai-workspace-prompt-input"
					autocomplete="off"
					rows="5"
				></textarea>
			</label>
			<div class="mt-2 flex flex-wrap items-center gap-2">
				<button
					type="button"
					class="rounded border border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-raised)] px-3 py-1.5 text-xs font-medium text-[color:var(--ce-l-text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
					disabled={!canRetrieve || ingesting}
					data-testid="case-ai-workspace-retrieve-button"
					title={canRetrieve ? P130_AI_WORKSPACE_SEND_RETRIEVE_TITLE : P130_AI_WORKSPACE_SEND_DISABLED_TITLE}
					on:click={runRetrieval}
				>
					{P130_AI_WORKSPACE_SEND_RETRIEVE_BUTTON}
				</button>
				{#if ingesting}
					<span
						class="{DS_TYPE_CLASSES.meta} text-[color:var(--ce-l-text-muted)]"
						data-testid="case-ai-workspace-ingesting-label"
					>
						{P130_AI_WORKSPACE_INGESTING_LABEL}
					</span>
				{/if}
			</div>
		</form>

		{#if ingestionError}
			<div
				class="rounded border border-red-300/80 bg-red-50/80 p-3 dark:border-red-800 dark:bg-red-950/40"
				role="alert"
				data-testid="case-ai-workspace-ingestion-error"
			>
				<p class="{DS_TYPE_CLASSES.body} m-0 text-sm text-red-800 dark:text-red-200">
					{ingestionError}
				</p>
			</div>
		{/if}

		<section
			class="{DS_PANEL_CLASSES.primaryDense} border border-[color:var(--ce-l-border-default)]"
			aria-labelledby="case-ai-workspace-output-heading"
			data-testid="case-ai-workspace-output-placeholder"
		>
			<h3
				id="case-ai-workspace-output-heading"
				class="{DS_TYPE_CLASSES.label} m-0 border-b border-[color:var(--ce-l-border-default)] px-3 py-2 text-[color:var(--ce-l-text-secondary)]"
			>
				{P130_AI_WORKSPACE_OUTPUT_REGION_LABEL}
			</h3>
			<div class="px-3 py-3">
				{#if bundle}
					<p
						class="{DS_TYPE_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-primary)]"
						data-testid="case-ai-workspace-ingestion-success"
					>
						{P130_AI_WORKSPACE_INGESTION_SUCCESS}
					</p>
				{:else}
					<p class="{DS_TYPE_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-muted)]">
						{P130_AI_WORKSPACE_OUTPUT_EMPTY}
					</p>
				{/if}
			</div>
		</section>

		<section
			class="rounded border border-dashed border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-muted)] p-3"
			aria-labelledby="case-ai-workspace-data-used-heading"
			data-testid="case-ai-workspace-data-used"
		>
			<h3
				id="case-ai-workspace-data-used-heading"
				class="{DS_TYPE_CLASSES.label} m-0 text-[color:var(--ce-l-text-secondary)]"
			>
				{P130_AI_WORKSPACE_DATA_USED_SECTION_TITLE}
			</h3>
			<p class="{DS_TYPE_CLASSES.meta} m-0 mt-1 text-[color:var(--ce-l-text-muted)]">
				{P130_AI_WORKSPACE_DATA_USED_SECTION_INTRO}
			</p>
			{#if bundle}
				<ul
					class="m-0 mt-2 list-none space-y-1 p-0 text-sm text-[color:var(--ce-l-text-primary)]"
					data-testid="case-ai-workspace-data-used-counts"
				>
					<li data-testid="case-ai-workspace-count-timeline">
						{P130_AI_WORKSPACE_DATA_USED_TIMELINE}:
						<span class="tabular-nums">{bundle.sources.timeline.length}</span>
					</li>
					<li data-testid="case-ai-workspace-count-notes">
						{P130_AI_WORKSPACE_DATA_USED_NOTES}:
						<span class="tabular-nums">{bundle.sources.notes.length}</span>
					</li>
					<li data-testid="case-ai-workspace-count-files">
						{P130_AI_WORKSPACE_DATA_USED_FILES}:
						<span class="tabular-nums">{bundle.sources.files.length}</span>
					</li>
					<li data-testid="case-ai-workspace-count-entities">
						{P130_AI_WORKSPACE_DATA_USED_ENTITIES}:
						<span class="tabular-nums">{bundle.sources.entities.length}</span>
					</li>
					<li data-testid="case-ai-workspace-count-workflow">
						{P130_AI_WORKSPACE_DATA_USED_WORKFLOW}:
						<span class="tabular-nums">{bundle.sources.workflow.length}</span>
					</li>
				</ul>
			{:else}
				<p class="{DS_TYPE_CLASSES.meta} m-0 mt-2 text-[color:var(--ce-l-text-muted)]">
					—
				</p>
			{/if}
		</section>

		<section
			class="rounded border border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-raised)] p-3"
			aria-labelledby="case-ai-workspace-sources-trace-heading"
			data-testid="case-ai-workspace-sources-trace"
		>
			<h3
				id="case-ai-workspace-sources-trace-heading"
				class="{DS_TYPE_CLASSES.label} m-0 text-[color:var(--ce-l-text-secondary)]"
			>
				{P130_AI_WORKSPACE_SOURCES_TRACE_TITLE}
			</h3>
			<p class="{DS_TYPE_CLASSES.meta} m-0 mt-1 text-[color:var(--ce-l-text-muted)]">
				{P130_AI_WORKSPACE_SOURCES_TRACE_BODY}
			</p>
		</section>
	</div>
</div>
