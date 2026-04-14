<!--
	P130-01 — AI Workspace identity + framing (non-authoritative assistant layer).
	P130-02 — Read-only case retrieval on explicit user action (GET-only bundle; no LLM).
	P130-03 — Structured model output via Open WebUI chat completions (no Case Engine writes).
-->
<script lang="ts">
	import { browser } from '$app/environment';
	import { activeCaseMeta, caseEngineToken, models } from '$lib/stores';
	import { generateOpenAIChatCompletion } from '$lib/apis/openai';
	import { WEBUI_BASE_URL } from '$lib/constants';
	import { buildCaseRetrievalBundle } from '$lib/case/caseDataIngestion';
	import type { CaseRetrievalBundle } from '$lib/case/caseRetrievalBundleTypes';
	import { buildAiWorkspacePromptPayload } from '$lib/case/aiWorkspacePromptBuilder';
	import { parseAiWorkspaceLlmJsonWithBundle } from '$lib/case/aiWorkspaceResponseParser';
	import type { AiWorkspaceLlmJsonV1 } from '$lib/case/aiWorkspaceResponseTypes';
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
		P130_AI_WORKSPACE_SURFACE_TITLE,
		P130_AI_WORKSPACE_AI_SEND_BUTTON,
		P130_AI_WORKSPACE_AI_SEND_TITLE,
		P130_AI_WORKSPACE_AI_BUSY,
		P130_AI_WORKSPACE_NEED_BUNDLE_FIRST,
		P130_AI_WORKSPACE_NO_MODEL,
		P130_AI_WORKSPACE_NO_OWUI_TOKEN,
		P130_AI_WORKSPACE_SECTION_SOURCE_FACTS,
		P130_AI_WORKSPACE_SECTION_AI_CONTENT,
		P130_AI_WORKSPACE_SECTION_SOURCES_USED,
		P130_AI_WORKSPACE_PARSE_ERROR,
		P130_AI_WORKSPACE_TRACEABILITY_WARNINGS
	} from '$lib/caseContext/p130AIWorkspaceCopy';

	/** Route case id from `/case/:id/ai-workspace` (display fallback if meta not loaded). */
	export let caseId: string;

	let bundle: CaseRetrievalBundle | null = null;
	let ingestionError: string | null = null;
	let ingesting = false;

	let promptText = '';
	let parsedAi: AiWorkspaceLlmJsonV1 | null = null;
	let aiWarnings: string[] = [];
	let llmError: string | null = null;
	let parseError: string | null = null;
	let aiBusy = false;

	function owuiToken(): string {
		if (!browser) return '';
		return typeof localStorage !== 'undefined' ? String(localStorage.token ?? '') : '';
	}

	$: modelId =
		($models.find((m) => (m as { owned_by?: string }).owned_by === 'ollama') ?? $models[0])?.id ??
		undefined;
	$: modelAvailable = $models.length > 0;

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
		parsedAi = null;
		aiWarnings = [];
		llmError = null;
		parseError = null;
		try {
			bundle = await buildCaseRetrievalBundle(cid, token);
		} catch (e: unknown) {
			ingestionError = e instanceof Error ? e.message : String(e);
			bundle = null;
		} finally {
			ingesting = false;
		}
	}

	async function runAiSend() {
		const cid = String(caseId ?? '').trim();
		const token = $caseEngineToken;
		llmError = null;
		parseError = null;
		parsedAi = null;
		aiWarnings = [];

		if (!bundle) {
			llmError = P130_AI_WORKSPACE_NEED_BUNDLE_FIRST;
			return;
		}
		if (bundle.case_id !== cid) {
			llmError = P130_AI_WORKSPACE_NEED_BUNDLE_FIRST;
			return;
		}
		if (!promptText.trim()) {
			llmError = 'Enter a prompt before sending.';
			return;
		}
		if (!token) {
			llmError = P130_AI_WORKSPACE_NEED_BUNDLE_FIRST;
			return;
		}
		if (!modelAvailable || !modelId) {
			llmError = P130_AI_WORKSPACE_NO_MODEL;
			return;
		}
		const tok = owuiToken();
		if (!tok) {
			llmError = P130_AI_WORKSPACE_NO_OWUI_TOKEN;
			return;
		}

		aiBusy = true;
		try {
			const { system, user } = buildAiWorkspacePromptPayload({
				caseId: cid,
				userPrompt: promptText,
				bundle
			});
			const res = await generateOpenAIChatCompletion(
				tok,
				{
					model: modelId,
					temperature: 0,
					stream: false,
					messages: [
						{ role: 'system', content: system },
						{ role: 'user', content: user }
					]
				},
				`${WEBUI_BASE_URL}/api`
			);
			const content: string =
				(res as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message?.content ?? '';
			const parsed = parseAiWorkspaceLlmJsonWithBundle(content, bundle);
			if (!parsed.ok) {
				parseError = `${P130_AI_WORKSPACE_PARSE_ERROR}: ${parsed.message}`;
				return;
			}
			parsedAi = parsed.data;
			aiWarnings = parsed.warnings;
		} catch (e: unknown) {
			llmError = e instanceof Error ? e.message : String(e);
		} finally {
			aiBusy = false;
		}
	}

	$: caseNumberLabel = ($activeCaseMeta?.case_number ?? '').trim() || caseId || '—';
	$: caseTitleLabel = ($activeCaseMeta?.title ?? '').trim() || '—';
	$: canRetrieve = Boolean(String(caseId ?? '').trim() && $caseEngineToken);
	$: canSendAi =
		canRetrieve &&
		!ingesting &&
		!aiBusy &&
		Boolean(bundle) &&
		Boolean(promptText.trim()) &&
		modelAvailable &&
		Boolean(modelId) &&
		Boolean(owuiToken());
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
					bind:value={promptText}
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
				<button
					type="button"
					class="rounded border border-violet-500/80 bg-violet-950/20 px-3 py-1.5 text-xs font-medium text-[color:var(--ce-l-text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
					disabled={!canSendAi}
					data-testid="case-ai-workspace-ai-send-button"
					title={P130_AI_WORKSPACE_AI_SEND_TITLE}
					on:click={runAiSend}
				>
					{P130_AI_WORKSPACE_AI_SEND_BUTTON}
				</button>
				{#if ingesting}
					<span
						class="{DS_TYPE_CLASSES.meta} text-[color:var(--ce-l-text-muted)]"
						data-testid="case-ai-workspace-ingesting-label"
					>
						{P130_AI_WORKSPACE_INGESTING_LABEL}
					</span>
				{/if}
				{#if aiBusy}
					<span class="{DS_TYPE_CLASSES.meta} text-[color:var(--ce-l-text-muted)]" data-testid="case-ai-workspace-ai-busy">
						{P130_AI_WORKSPACE_AI_BUSY}
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
			<div class="space-y-3 px-3 py-3">
				<div data-testid="case-ai-workspace-retrieval-status">
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

				{#if llmError}
					<div
						class="rounded border border-amber-600/50 bg-amber-50/80 p-2 dark:bg-amber-950/30"
						role="alert"
						data-testid="case-ai-workspace-llm-error"
					>
						<p class="{DS_TYPE_CLASSES.body} m-0 text-sm text-amber-900 dark:text-amber-100">
							{llmError}
						</p>
					</div>
				{/if}

				{#if parseError}
					<div
						class="rounded border border-red-300/80 bg-red-50/80 p-2 dark:border-red-800 dark:bg-red-950/40"
						role="alert"
						data-testid="case-ai-workspace-parse-error"
					>
						<p class="{DS_TYPE_CLASSES.body} m-0 text-sm text-red-800 dark:text-red-200">
							{parseError}
						</p>
					</div>
				{/if}

				{#if parsedAi}
					<div class="space-y-3 border-t border-[color:var(--ce-l-border-default)] pt-3" data-testid="case-ai-workspace-ai-structured">
						<section data-testid="case-ai-workspace-source-backed-facts">
							<h4 class="{DS_TYPE_CLASSES.label} m-0 text-[color:var(--ce-l-text-secondary)]">
								{P130_AI_WORKSPACE_SECTION_SOURCE_FACTS}
							</h4>
							<ul class="m-0 mt-1 list-disc space-y-2 pl-5 text-sm text-[color:var(--ce-l-text-primary)]">
								{#each parsedAi.source_backed_facts as fact, i (i)}
									<li>
										<p class="m-0">{fact.statement}</p>
										<p class="{DS_TYPE_CLASSES.meta} m-0 mt-0.5 text-[color:var(--ce-l-text-muted)]">
											Refs: timeline {fact.refs.timeline_entry_ids?.length ?? 0}, notes {fact.refs.note_ids
												?.length ?? 0}, files {fact.refs.file_ids?.length ?? 0}, entities {fact.refs
												.entity_ids?.length ?? 0}, workflow {fact.refs.workflow_item_ids?.length ?? 0}
										</p>
									</li>
								{/each}
							</ul>
						</section>
						<section data-testid="case-ai-workspace-ai-generated">
							<h4 class="{DS_TYPE_CLASSES.label} m-0 text-[color:var(--ce-l-text-secondary)]">
								{P130_AI_WORKSPACE_SECTION_AI_CONTENT}
							</h4>
							<p class="m-0 mt-1 whitespace-pre-wrap text-sm text-[color:var(--ce-l-text-primary)]">
								{parsedAi.ai_generated_content}
							</p>
						</section>
						<section data-testid="case-ai-workspace-sources-used-declared">
							<h4 class="{DS_TYPE_CLASSES.label} m-0 text-[color:var(--ce-l-text-secondary)]">
								{P130_AI_WORKSPACE_SECTION_SOURCES_USED}
							</h4>
							<ul class="m-0 mt-1 list-none space-y-1 text-sm text-[color:var(--ce-l-text-primary)]">
								<li>Timeline entry IDs: {parsedAi.sources_used.timeline_entry_ids.join(', ') || '—'}</li>
								<li>Note IDs: {parsedAi.sources_used.note_ids.join(', ') || '—'}</li>
								<li>
									Files:
									{#if parsedAi.sources_used.file_ids.length === 0}
										—
									{:else}
										<ul class="m-0 mt-1 list-disc pl-5">
											{#each parsedAi.sources_used.file_ids as f (f.id)}
												<li>{f.id} (extracted text used: {f.extracted_text_used ? 'yes' : 'no'})</li>
											{/each}
										</ul>
									{/if}
								</li>
								<li>Entity IDs: {parsedAi.sources_used.entity_ids.join(', ') || '—'}</li>
								<li>Workflow item IDs: {parsedAi.sources_used.workflow_item_ids.join(', ') || '—'}</li>
							</ul>
						</section>
					</div>
				{/if}

				{#if aiWarnings.length > 0}
					<div
						class="rounded border border-amber-600/50 bg-amber-50/80 p-2 dark:bg-amber-950/30"
						data-testid="case-ai-workspace-warnings"
					>
						<p class="{DS_TYPE_CLASSES.label} m-0 text-amber-950 dark:text-amber-100">
							{P130_AI_WORKSPACE_TRACEABILITY_WARNINGS}
						</p>
						<ul class="m-0 mt-1 list-disc pl-5 text-sm text-amber-900 dark:text-amber-50">
							{#each aiWarnings as w (w)}
								<li>{w}</li>
							{/each}
						</ul>
					</div>
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
