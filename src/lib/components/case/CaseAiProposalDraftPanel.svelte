<script lang="ts">
	/**
	 * P101-04 / P101-05 — Phase 101 proposal draft (AI-assisted). Creates proposals via
	 * POST /cases/:id/case-proposals only — no direct timeline_entries / case_tasks writes.
	 */
	import { browser } from '$app/environment';
	import { toast } from 'svelte-sonner';
	import { generateOpenAIChatCompletion } from '$lib/apis/openai';
	import { createCaseProposalManual } from '$lib/apis/caseEngine/caseProposalsApi';
	import {
		buildAiTraceV1,
		buildTaskDraftPrompts,
		buildTimelineDraftPrompts,
		extractJsonObjectFromAiText,
		isP101ProposalType,
		mergePayloadWithAiTrace,
		parseAndValidateSourceRefsJson,
		whitelistTaskPayload,
		whitelistTimelinePayload,
		type P101ProposalType
	} from '$lib/case/p101AiCaseProposalDraft';
	import * as P101 from '$lib/case/p101ProposalUiCopy';
	import { WEBUI_BASE_URL } from '$lib/constants';
	import {
		DS_BANNER_CLASSES,
		DS_BTN_CLASSES,
		DS_PANEL_CLASSES,
		DS_STATUS_SURFACE_CLASSES,
		DS_STATUS_TEXT_CLASSES,
		DS_TYPE_CLASSES,
		DS_WORKFLOW_CLASSES,
		DS_WORKFLOW_TEXT_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import { models } from '$lib/stores';

	export let caseId: string;
	export let caseEngineToken: string;
	export let defaultProposalType: P101ProposalType = 'task';
	/** Surface hint only (Tasks vs Timeline) — does not change authority of proposals. */
	export let surfaceLabel = 'Case';

	let proposalType: P101ProposalType = defaultProposalType;

	let userInstructions = '';
	let optionalContextText = '';
	let sourceRefsJsonText = '';

	let generating = false;
	let submitting = false;
	let aiError = '';
	let submitError = '';

	let rawAiResponse = '';
	let draftPayload: Record<string, unknown> | null = null;

	$: modelId =
		($models.find((m) => (m as { owned_by?: string }).owned_by === 'ollama') ?? $models[0])?.id ??
		undefined;
	$: modelAvailable = $models.length > 0;

	let lastCaseId = '';
	let lastSurfaceKey = '';

	function fullReset(): void {
		proposalType = defaultProposalType;
		userInstructions = '';
		optionalContextText = '';
		sourceRefsJsonText = '';
		aiError = '';
		submitError = '';
		rawAiResponse = '';
		draftPayload = null;
		generating = false;
		submitting = false;
	}

	function draftResetOnly(): void {
		aiError = '';
		submitError = '';
		rawAiResponse = '';
		draftPayload = null;
		generating = false;
		submitting = false;
	}

	$: if (caseId) {
		if (caseId !== lastCaseId) {
			lastCaseId = caseId;
			lastSurfaceKey = `${caseId}|${defaultProposalType}`;
			fullReset();
		} else {
			const sk = `${caseId}|${defaultProposalType}`;
			if (lastSurfaceKey && sk !== lastSurfaceKey) {
				lastSurfaceKey = sk;
				proposalType = defaultProposalType;
				draftResetOnly();
			}
		}
	}

	function setProposalType(next: P101ProposalType): void {
		if (next === proposalType) return;
		proposalType = next;
		draftResetOnly();
	}

	function owuiToken(): string {
		if (!browser) return '';
		return typeof localStorage !== 'undefined' ? String(localStorage.token ?? '') : '';
	}

	async function onGenerateDraft(): Promise<void> {
		const capturedCaseId = caseId.trim();
		if (!capturedCaseId) {
			aiError = P101.ERR_CASE_ENGINE_UNAVAILABLE;
			return;
		}

		submitError = '';
		aiError = '';
		draftPayload = null;
		rawAiResponse = '';

		const instr = userInstructions.trim();
		if (instr.length < 3) {
			aiError = P101.ERR_INSTRUCTIONS_SHORT;
			return;
		}
		if (!caseEngineToken.trim()) {
			aiError = P101.ERR_CASE_ENGINE_UNAVAILABLE;
			return;
		}
		if (!modelAvailable || !modelId) {
			aiError = P101.ERR_NO_MODEL;
			return;
		}
		const tok = owuiToken();
		if (!tok) {
			aiError = P101.ERR_NO_OWUI_TOKEN;
			return;
		}

		const { system, user } =
			proposalType === 'timeline_entry'
				? buildTimelineDraftPrompts({
						userInstructions: instr,
						optionalContextText: optionalContextText.trim() || undefined
					})
				: buildTaskDraftPrompts({
						userInstructions: instr,
						optionalContextText: optionalContextText.trim() || undefined
					});

		generating = true;
		try {
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
			if (capturedCaseId !== caseId.trim()) {
				aiError = P101.ERR_CASE_CHANGED;
				return;
			}
			const content: string =
				(res as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message?.content ?? '';
			rawAiResponse = content;
			const parsed = extractJsonObjectFromAiText(content);
			if (!parsed.ok) {
				aiError = parsed.error;
				return;
			}
			const wl =
				proposalType === 'timeline_entry'
					? whitelistTimelinePayload(parsed.value)
					: whitelistTaskPayload(parsed.value);
			if (!wl.ok) {
				aiError = wl.error;
				return;
			}
			draftPayload = wl.data;
		} catch (e: unknown) {
			if (capturedCaseId !== caseId.trim()) {
				aiError = P101.ERR_CASE_CHANGED;
				return;
			}
			aiError = (e as Error)?.message ?? P101.ERR_SUBMIT_FAILED;
		} finally {
			generating = false;
		}
	}

	function bindTimelineField(key: string, v: string): void {
		if (!draftPayload) return;
		draftPayload = { ...draftPayload, [key]: v };
	}

	function bindTaskField(key: string, v: string | null): void {
		if (!draftPayload) return;
		if (v === null || v === '') {
			if (key === 'title') {
				draftPayload = { ...draftPayload, title: '' };
				return;
			}
			const next = { ...draftPayload };
			delete next[key];
			draftPayload = next;
			return;
		}
		draftPayload = { ...draftPayload, [key]: v };
	}

	async function onSubmitProposal(): Promise<void> {
		const capturedCaseId = caseId.trim();
		submitError = '';
		if (!capturedCaseId || !caseEngineToken.trim()) {
			submitError = P101.ERR_CASE_ENGINE_UNAVAILABLE;
			return;
		}
		if (!isP101ProposalType(proposalType)) {
			submitError = 'Unsupported proposal type.';
			return;
		}
		if (!draftPayload) {
			submitError = P101.ERR_NO_DRAFT;
			return;
		}

		const sr = parseAndValidateSourceRefsJson(sourceRefsJsonText);
		if (!sr.ok) {
			submitError = sr.error;
			return;
		}

		const reParsed =
			proposalType === 'timeline_entry'
				? whitelistTimelinePayload(draftPayload)
				: whitelistTaskPayload(draftPayload);
		if (!reParsed.ok) {
			submitError = reParsed.error;
			return;
		}

		const trace = buildAiTraceV1({
			userInstructions: userInstructions,
			optionalContextText: optionalContextText.trim() || undefined,
			modelId,
			rawAiResponse
		});
		const payload = mergePayloadWithAiTrace(reParsed.data, trace);

		submitting = true;
		try {
			const created = await createCaseProposalManual(capturedCaseId, caseEngineToken, {
				creation_mode: 'manual',
				proposal_type: proposalType,
				payload,
				source_refs: sr.value.length ? sr.value : undefined
			});
			if (capturedCaseId !== caseId.trim()) {
				submitError = P101.ERR_CASE_CHANGED;
				return;
			}
			toast.success(P101.P101_TOAST_PROPOSAL_CREATED);
			draftResetOnly();
			userInstructions = '';
			optionalContextText = '';
			sourceRefsJsonText = '';
		} catch (e: unknown) {
			if (capturedCaseId !== caseId.trim()) {
				submitError = P101.ERR_CASE_CHANGED;
				return;
			}
			submitError = (e as Error)?.message ?? P101.ERR_SUBMIT_FAILED;
		} finally {
			submitting = false;
		}
	}

	$: sourceRefsPreview =
		sourceRefsJsonText.trim() === ''
			? ''
			: (() => {
					const p = parseAndValidateSourceRefsJson(sourceRefsJsonText);
					if (!p.ok) return '';
					try {
						return JSON.stringify(p.value, null, 2);
					} catch {
						return '';
					}
				})();
</script>

<div
	class="{DS_PANEL_CLASSES.muted} shrink-0 mb-3"
	data-testid="p101-ai-proposal-draft-panel"
	data-surface={surfaceLabel}
	data-case-id={caseId}
>
	<p
		class="{DS_TYPE_CLASSES.label} uppercase tracking-wide text-[10px] m-0 mb-1"
		data-testid="p101-ai-proposal-draft-eyebrow"
	>
		{P101.P101_PANEL_EYEBROW} · {surfaceLabel}
	</p>
	<div class="{DS_WORKFLOW_CLASSES.doctrineBlock} mb-3">
		<p class="{DS_WORKFLOW_TEXT_CLASSES.doctrineProse} m-0 text-xs">
			{P101.P101_PROPOSAL_DOCTRINE}
		</p>
	</div>

	{#if !caseEngineToken.trim()}
		<div
			class="{DS_BANNER_CLASSES.base} {DS_STATUS_SURFACE_CLASSES.warning} mb-3 p-3 rounded"
			data-testid="p101-ai-proposal-no-ce-token"
		>
			<p class="m-0 text-xs {DS_STATUS_TEXT_CLASSES.warning}">
				{P101.ERR_CASE_ENGINE_UNAVAILABLE}
			</p>
		</div>
	{/if}

	<div class="flex flex-wrap gap-3 items-center mb-2">
		<span class="{DS_TYPE_CLASSES.body} text-xs">{P101.P101_LABEL_PROPOSAL_TYPE}</span>
		<label class="flex items-center gap-1 text-xs cursor-pointer">
			<input
				type="radio"
				name="p101-proposal-type"
				value="timeline_entry"
				checked={proposalType === 'timeline_entry'}
				on:change={() => setProposalType('timeline_entry')}
				data-testid="p101-proposal-type-timeline"
			/>
			timeline_entry
		</label>
		<label class="flex items-center gap-1 text-xs cursor-pointer">
			<input
				type="radio"
				name="p101-proposal-type"
				value="task"
				checked={proposalType === 'task'}
				on:change={() => setProposalType('task')}
				data-testid="p101-proposal-type-task"
			/>
			task
		</label>
	</div>

	<label class="block mb-2">
		<span class="{DS_TYPE_CLASSES.body} text-xs">{P101.P101_LABEL_INSTRUCTIONS}</span>
		<textarea
			class="mt-1 w-full min-h-[72px] text-xs rounded border border-[color:var(--ce-l-border)] bg-[color:var(--ce-l-surface)] p-2"
			bind:value={userInstructions}
			placeholder="Describe the draft. Only content you provide in instructions and optional context is in scope."
			data-testid="p101-ai-proposal-instructions"
			disabled={!caseEngineToken.trim()}
		/>
	</label>

	<label class="block mb-2">
		<span class="{DS_TYPE_CLASSES.body} text-xs">{P101.P101_LABEL_OPTIONAL_CONTEXT}</span>
		<textarea
			class="mt-1 w-full min-h-[56px] text-xs rounded border border-[color:var(--ce-l-border)] bg-[color:var(--ce-l-surface)] p-2"
			bind:value={optionalContextText}
			data-testid="p101-ai-proposal-context"
			disabled={!caseEngineToken.trim()}
		/>
	</label>

	<label class="block mb-2">
		<span class="{DS_TYPE_CLASSES.body} text-xs">{P101.P101_LABEL_SOURCE_REFS}</span>
		<textarea
			class="mt-1 w-full min-h-[44px] font-mono text-[11px] rounded border border-[color:var(--ce-l-border)] bg-[color:var(--ce-l-surface)] p-2"
			bind:value={sourceRefsJsonText}
			placeholder={'e.g. [{"kind":"case_file","id":"..."}]'}
			data-testid="p101-ai-proposal-source-refs"
			disabled={!caseEngineToken.trim()}
		/>
	</label>

	<div class="flex flex-wrap gap-2 mb-2">
		<button
			type="button"
			class="{DS_BTN_CLASSES.secondary} text-xs px-2 py-1"
			disabled={generating || !modelAvailable || !caseEngineToken.trim() || !caseId.trim()}
			on:click={onGenerateDraft}
			data-testid="p101-ai-proposal-generate"
			aria-busy={generating}
		>
			{generating ? P101.P101_LABEL_GENERATING : P101.P101_LABEL_GENERATE}
		</button>
	</div>

	{#if aiError}
		<p class="text-xs text-red-600 dark:text-red-400 mb-2" data-testid="p101-ai-proposal-ai-error">{aiError}</p>
	{/if}

	{#if draftPayload && proposalType === 'timeline_entry'}
		<div class="border border-[color:var(--ce-l-border)] rounded p-2 mb-2 space-y-2" data-testid="p101-ai-proposal-edit-timeline">
			<p class="{DS_TYPE_CLASSES.body} text-xs m-0 font-medium">{P101.P101_LABEL_REVIEW_EDIT_TIMELINE}</p>
			<label class="block text-xs">
				occurred_at
				<input
					class="mt-0.5 w-full font-mono text-[11px] p-1 rounded border border-[color:var(--ce-l-border)]"
					value={String(draftPayload.occurred_at ?? '')}
					on:input={(e) => bindTimelineField('occurred_at', e.currentTarget.value)}
				/>
			</label>
			<label class="block text-xs">
				type
				<input
					class="mt-0.5 w-full p-1 rounded border border-[color:var(--ce-l-border)]"
					value={String(draftPayload.type ?? '')}
					on:input={(e) => bindTimelineField('type', e.currentTarget.value)}
				/>
			</label>
			<label class="block text-xs">
				text_original
				<textarea
					class="mt-0.5 w-full min-h-[80px] text-xs p-1 rounded border border-[color:var(--ce-l-border)]"
					value={String(draftPayload.text_original ?? '')}
					on:input={(e) => bindTimelineField('text_original', e.currentTarget.value)}
				/>
			</label>
			<label class="block text-xs">
				text_cleaned (optional)
				<input
					class="mt-0.5 w-full p-1 rounded border border-[color:var(--ce-l-border)]"
					value={draftPayload.text_cleaned != null ? String(draftPayload.text_cleaned) : ''}
					on:input={(e) => bindTimelineField('text_cleaned', e.currentTarget.value)}
				/>
			</label>
			<label class="block text-xs">
				location_text (optional)
				<input
					class="mt-0.5 w-full p-1 rounded border border-[color:var(--ce-l-border)]"
					value={draftPayload.location_text != null ? String(draftPayload.location_text) : ''}
					on:input={(e) => bindTimelineField('location_text', e.currentTarget.value)}
				/>
			</label>
			<label class="block text-xs">
				tags (optional — string or JSON)
				<textarea
					class="mt-0.5 w-full min-h-[44px] font-mono text-[11px] p-1 rounded border border-[color:var(--ce-l-border)]"
					value={draftPayload.tags != null ? (typeof draftPayload.tags === 'string' ? draftPayload.tags : JSON.stringify(draftPayload.tags)) : ''}
					on:input={(e) => {
						const v = e.currentTarget.value.trim();
						if (!v) {
							const next = { ...draftPayload! };
							delete next.tags;
							draftPayload = next;
							return;
						}
						try {
							draftPayload = { ...draftPayload!, tags: JSON.parse(v) };
						} catch {
							draftPayload = { ...draftPayload!, tags: v };
						}
					}}
				/>
			</label>
		</div>
	{/if}

	{#if draftPayload && proposalType === 'task'}
		<div class="border border-[color:var(--ce-l-border)] rounded p-2 mb-2 space-y-2" data-testid="p101-ai-proposal-edit-task">
			<p class="{DS_TYPE_CLASSES.body} text-xs m-0 font-medium">{P101.P101_LABEL_REVIEW_EDIT_TASK}</p>
			<label class="block text-xs">
				title
				<input
					class="mt-0.5 w-full p-1 rounded border border-[color:var(--ce-l-border)]"
					value={String(draftPayload.title ?? '')}
					on:input={(e) => bindTaskField('title', e.currentTarget.value)}
				/>
			</label>
			<label class="block text-xs">
				description (optional)
				<textarea
					class="mt-0.5 w-full min-h-[64px] text-xs p-1 rounded border border-[color:var(--ce-l-border)]"
					value={draftPayload.description != null ? String(draftPayload.description) : ''}
					on:input={(e) => bindTaskField('description', e.currentTarget.value || null)}
				/>
			</label>
			<label class="block text-xs">
				timeline_entry_id (optional)
				<input
					class="mt-0.5 w-full font-mono text-[11px] p-1 rounded border border-[color:var(--ce-l-border)]"
					value={draftPayload.timeline_entry_id != null ? String(draftPayload.timeline_entry_id) : ''}
					on:input={(e) => bindTaskField('timeline_entry_id', e.currentTarget.value || null)}
				/>
			</label>
			<label class="block text-xs">
				assignee_user_id (optional)
				<input
					class="mt-0.5 w-full font-mono text-[11px] p-1 rounded border border-[color:var(--ce-l-border)]"
					value={draftPayload.assignee_user_id != null ? String(draftPayload.assignee_user_id) : ''}
					on:input={(e) => bindTaskField('assignee_user_id', e.currentTarget.value || null)}
				/>
			</label>
			<label class="block text-xs">
				due_date (optional YYYY-MM-DD)
				<input
					class="mt-0.5 w-full font-mono text-[11px] p-1 rounded border border-[color:var(--ce-l-border)]"
					value={draftPayload.due_date != null ? String(draftPayload.due_date) : ''}
					on:input={(e) => bindTaskField('due_date', e.currentTarget.value || null)}
				/>
			</label>
			<label class="block text-xs">
				priority (optional)
				<select
					class="mt-0.5 w-full text-xs p-1 rounded border border-[color:var(--ce-l-border)]"
					value={draftPayload.priority != null ? String(draftPayload.priority) : ''}
					on:change={(e) => {
						const v = e.currentTarget.value;
						bindTaskField('priority', v || null);
					}}
				>
					<option value="">(none)</option>
					<option value="low">low</option>
					<option value="medium">medium</option>
					<option value="high">high</option>
				</select>
			</label>
			<label class="block text-xs">
				group_label (optional)
				<input
					class="mt-0.5 w-full p-1 rounded border border-[color:var(--ce-l-border)]"
					value={draftPayload.group_label != null ? String(draftPayload.group_label) : ''}
					on:input={(e) => bindTaskField('group_label', e.currentTarget.value || null)}
				/>
			</label>
		</div>
	{/if}

	{#if draftPayload}
		<details class="mb-2 text-xs" data-testid="p101-ai-proposal-trace-details">
			<summary class="cursor-pointer text-[color:var(--ce-l-text-muted)]">{P101.P101_TRACE_SUMMARY_LABEL}</summary>
			{#if sourceRefsPreview}
				<p class="mt-2 mb-0 text-[10px] text-[color:var(--ce-l-text-muted)]">{P101.P101_TRACE_SOURCE_REFS_PREVIEW_LABEL}</p>
				<pre
					class="mt-1 p-2 overflow-x-auto max-h-24 rounded bg-black/5 dark:bg-white/5 text-[10px]"
					data-testid="p101-ai-proposal-source-refs-preview">{sourceRefsPreview}</pre>
			{/if}
			<p class="mt-2 mb-0 text-[10px] text-[color:var(--ce-l-text-muted)]">{P101.P101_TRACE_MODEL_OUTPUT_LABEL}</p>
			<pre
				class="mt-1 p-2 overflow-x-auto max-h-40 rounded bg-black/5 dark:bg-white/5 text-[10px]"
				data-testid="p101-ai-proposal-raw-model-output">{rawAiResponse}</pre>
		</details>
	{/if}

	{#if draftPayload}
		<button
			type="button"
			class="{DS_BTN_CLASSES.primary} text-xs px-2 py-1"
			disabled={submitting || !caseId.trim() || !caseEngineToken.trim()}
			on:click={onSubmitProposal}
			data-testid="p101-ai-proposal-submit"
			aria-busy={submitting}
		>
			{submitting ? P101.P101_LABEL_SUBMITTING : P101.P101_LABEL_SUBMIT}
		</button>
	{/if}

	{#if submitError}
		<p class="text-xs text-red-600 dark:text-red-400 mt-2" data-testid="p101-ai-proposal-submit-error">{submitError}</p>
	{/if}
</div>
