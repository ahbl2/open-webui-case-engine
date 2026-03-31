<!--
  P34-18 / P34-19 — Review + accept / edit / reject (P34-19).
  P34-26 — Operational draft workflow: rendered draft primary; structure secondary.
  P34-29 — Accept / Edit load the draft into the parent editor only; Save note persists.
-->
<script lang="ts">
	import type { StructuredNotesExtractionPreviewData } from '$lib/types/structuredNotes/extractionPreview';

	export let originalNoteText: string;
	export let loading: boolean;
	export let errorMessage: string;
	export let data: StructuredNotesExtractionPreviewData | null;
	export let testIdPrefix: string;
	/** Clears preview state in parent (coexistence / reset). */
	export let onClosePanel: (() => void) | undefined = undefined;
	/** True when render is usable (not blocked) and there is draft text to load into the editor (Accept or Edit). */
	export let canCommitDraft = false;
	/** P34-19: user chose Edit Draft — Save uses structured save-edited endpoint. */
	export let editedCommitPending = false;
	export let actionBusy = false;
	export let onAcceptDraft: (() => void) | undefined = undefined;
	export let onEditDraft: (() => void) | undefined = undefined;
	export let onRejectPreview: (() => void) | undefined = undefined;
	/** P34-20 — statement ↔ render block click (no ids/content in callback). */
	export let onTraceabilityInteraction:
		| ((detail: { kind: 'statement_row' | 'render_block' }) => void)
		| undefined = undefined;

	let traceStatementId = '';
	let traceBlockId = '';

	$: if (!data) {
		traceStatementId = '';
		traceBlockId = '';
	}

	function blockIdForStatement(statementId: string): string {
		return `stmt-${statementId}`;
	}

	function onStatementClick(statementId: string): void {
		traceStatementId = statementId;
		traceBlockId = blockIdForStatement(statementId);
		onTraceabilityInteraction?.({ kind: 'statement_row' });
	}

	function onRenderedBlockClick(block: { blockId: string; kind: string; text: string }): void {
		traceBlockId = block.blockId;
		if (block.kind === 'statement' && block.blockId.startsWith('stmt-')) {
			traceStatementId = block.blockId.slice(5);
		} else {
			traceStatementId = '';
		}
		onTraceabilityInteraction?.({ kind: 'render_block' });
	}

	function validationHeadline(status: string): string {
		if (status === 'pass') return 'Draft ready';
		if (status === 'pass_with_warnings') return 'Review recommended';
		if (status === 'fail') return 'Draft could not be generated';
		return 'Draft status';
	}

	$: statementRenderBlocks =
		data?.render?.blocks?.filter((b) => b.kind === 'statement') ?? [];

	$: showAcceptEdit =
		canCommitDraft && !editedCommitPending && !actionBusy && !loading && data != null;

	$: hasValidationDetails =
		data != null &&
		(data.validation.errors.length > 0 ||
			data.validation.warnings.length > 0 ||
			data.validation.blockedRender);
</script>

<div
	class="shrink-0 mx-5 mt-2 mb-1 rounded border border-teal-200/90 dark:border-teal-800/80 bg-teal-50/90 dark:bg-teal-950/30 px-3 py-3 text-xs space-y-3"
	data-testid="{testIdPrefix}-panel"
>
	<div class="flex flex-wrap items-start justify-between gap-2">
		<div>
			<p class="text-sm font-semibold text-teal-950 dark:text-teal-100">
				Structured Draft (from your note)
			</p>
			<p class="text-[11px] text-teal-800/95 dark:text-teal-300/90 mt-1 leading-snug max-w-prose">
				This draft is generated from your original note. Review before saving.
			</p>
		</div>
		{#if onClosePanel}
			<button
				type="button"
				class="shrink-0 text-xs px-2.5 py-1 rounded border border-teal-400/70 text-teal-900 dark:text-teal-100 dark:border-teal-600 hover:bg-teal-100/80 dark:hover:bg-teal-900/40"
				data-testid="{testIdPrefix}-close"
				on:click={onClosePanel}
			>
				Close
			</button>
		{/if}
	</div>

	{#if editedCommitPending && data}
		<div
			class="rounded border border-amber-300/80 bg-amber-50/90 dark:border-amber-700 dark:bg-amber-950/30 px-2 py-1.5 text-[11px] text-amber-950 dark:text-amber-100"
			data-testid="{testIdPrefix}-edit-disclaimer"
		>
			You are editing this draft in the note editor. Use <strong>Save</strong> (or <strong>Save note</strong>) to commit; that
			save uses the structured edit path and does not auto-save while you type.
		</div>
	{/if}

	{#if loading}
		<p class="text-xs text-gray-600 dark:text-gray-400" data-testid="{testIdPrefix}-loading">
			Generating structured draft…
		</p>
	{:else if errorMessage}
		<p class="text-xs text-red-700 dark:text-red-300" data-testid="{testIdPrefix}-error">{errorMessage}</p>
	{:else if data}
		<div
			class="rounded border px-2.5 py-2 text-xs {data.validation.status === 'fail'
				? 'border-red-300 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950/30 dark:text-red-200'
				: data.validation.status === 'pass_with_warnings'
					? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/25 dark:text-amber-100'
					: 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/25 dark:text-emerald-100'}"
			data-testid="{testIdPrefix}-validation"
		>
			<p class="font-semibold text-sm">{validationHeadline(data.validation.status)}</p>
			{#if data.validation.blockedRender}
				<p class="mt-1 text-[11px] opacity-95">The draft text could not be built for this note. You can close or reject below.</p>
			{/if}
			{#if hasValidationDetails}
				<details class="mt-2 text-[11px]">
					<summary
						class="cursor-pointer select-none text-gray-600 dark:text-gray-400 hover:underline font-medium"
					>
						Technical details
					</summary>
					<div class="mt-2 pl-1 border-l-2 border-gray-200 dark:border-gray-600 space-y-2">
						{#if data.validation.errors.length > 0}
							<ul class="list-disc pl-4 space-y-0.5">
								{#each data.validation.errors as err}
									<li>{err.message}</li>
								{/each}
							</ul>
						{/if}
						{#if data.validation.warnings.length > 0}
							<ul class="list-disc pl-4 space-y-0.5">
								{#each data.validation.warnings as w}
									<li>{w.message}</li>
								{/each}
							</ul>
						{/if}
					</div>
				</details>
			{/if}
		</div>

		<!-- Primary: rendered draft -->
		<div>
			<p class="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1.5">Draft</p>
			{#if data.render.status === 'blocked'}
				<p class="text-xs text-gray-700 dark:text-gray-300">No draft text — generation was blocked.</p>
			{:else if !data.render.renderedText.trim() && data.render.blocks.length === 0}
				<p class="text-xs text-gray-600 dark:text-gray-400 italic">Empty draft output.</p>
			{:else}
				<p class="text-[10px] text-gray-500 dark:text-gray-500 mb-1.5">
					Optional: click a paragraph to highlight the matching line in the breakdown below.
				</p>
				<div class="space-y-1 max-h-56 overflow-y-auto mb-2" data-testid="{testIdPrefix}-blocks">
					{#each statementRenderBlocks as blk}
						<button
							type="button"
							class="w-full text-left rounded border px-2 py-1.5 text-xs whitespace-pre-wrap font-sans {traceBlockId ===
							blk.blockId
								? 'border-teal-500 bg-teal-50/90 dark:border-teal-500 dark:bg-teal-900/35'
								: 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60'}"
							data-testid="{testIdPrefix}-render-block"
							data-block-id={blk.blockId}
							on:click={() => onRenderedBlockClick(blk)}
						>
							{blk.text}
						</button>
					{/each}
				</div>
				<textarea
					readonly
					class="w-full rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-2 text-xs text-gray-800 dark:text-gray-200 min-h-[6rem] max-h-[16rem] overflow-y-auto resize-y font-sans whitespace-pre-wrap"
					data-testid="{testIdPrefix}-rendered-text"
				>{data.render.renderedText}</textarea>
			{/if}
			{#if data.render.warnings.length > 0}
				<details class="mt-2 text-[10px] text-gray-600 dark:text-gray-400">
					<summary class="cursor-pointer hover:underline">Draft notices</summary>
					<ul class="list-disc pl-4 mt-1 space-y-0.5">
						{#each data.render.warnings as rw}
							<li>{rw.message}</li>
						{/each}
					</ul>
				</details>
			{/if}
		</div>

		<div class="space-y-2" data-testid="{testIdPrefix}-actions">
			<div class="flex flex-wrap gap-2 items-center">
				{#if showAcceptEdit && onAcceptDraft}
					<button
						type="button"
						class="text-xs px-3 py-2 rounded-md border border-teal-600 bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-50"
						data-testid="{testIdPrefix}-accept"
						disabled={actionBusy}
						on:click={onAcceptDraft}
					>
						Accept Draft
					</button>
				{/if}
				{#if showAcceptEdit && onEditDraft}
					<button
						type="button"
						class="text-xs px-3 py-2 rounded-md border border-teal-500 text-teal-900 dark:text-teal-100 dark:border-teal-500 font-medium hover:bg-teal-100/80 dark:hover:bg-teal-900/40 disabled:opacity-50"
						data-testid="{testIdPrefix}-edit"
						disabled={actionBusy}
						on:click={onEditDraft}
					>
						Edit Draft
					</button>
				{/if}
				{#if onRejectPreview}
					<button
						type="button"
						class="text-xs px-3 py-2 rounded-md border border-gray-400 text-gray-800 dark:text-gray-200 dark:border-gray-600 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
						data-testid="{testIdPrefix}-reject"
						disabled={actionBusy}
						on:click={onRejectPreview}
					>
						Reject
					</button>
				{/if}
			</div>
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1 text-[10px] text-gray-500 dark:text-gray-400 leading-snug">
				{#if showAcceptEdit && onAcceptDraft}
					<p>
						<span class="font-medium text-gray-600 dark:text-gray-300">Accept</span> — Load draft into the editor;
						use <span class="font-medium">Save note</span> to persist
					</p>
				{/if}
				{#if showAcceptEdit && onEditDraft}
					<p>
						<span class="font-medium text-gray-600 dark:text-gray-300">Edit</span> — Same as Accept, then change
						text; <span class="font-medium">Save note</span> to persist
					</p>
				{/if}
				{#if onRejectPreview}
					<p><span class="font-medium text-gray-600 dark:text-gray-300">Reject</span> — Keep your original note</p>
				{/if}
			</div>
			{#if data && (data.validation.blockedRender || data.render.status === 'blocked')}
				<p class="text-[11px] text-gray-600 dark:text-gray-400">
					Accept and Edit are not available. Use Reject or Close; your saved note is unchanged.
				</p>
			{:else if data && !showAcceptEdit && !editedCommitPending && !data.render.renderedText.trim()}
				<p class="text-[11px] text-gray-500 dark:text-gray-400 italic">No draft text was returned for this run.</p>
			{/if}
		</div>

		<!-- Secondary: original note -->
		<details class="group rounded border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/40 px-2 py-1.5">
			<summary
				class="cursor-pointer text-xs font-semibold text-gray-700 dark:text-gray-300 list-none flex items-center gap-1 [&::-webkit-details-marker]:hidden"
			>
				<span class="text-gray-400 group-open:rotate-90 transition-transform inline-block">▸</span>
				Original note
			</summary>
			<textarea
				readonly
				class="w-full mt-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs text-gray-800 dark:text-gray-200 min-h-[4rem] max-h-[10rem] overflow-y-auto resize-y font-sans whitespace-pre-wrap"
				data-testid="{testIdPrefix}-original"
			>{originalNoteText}</textarea>
		</details>

		<!-- Secondary: structured breakdown (collapsed) -->
		<details class="group rounded border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/40 px-2 py-1.5">
			<summary
				class="cursor-pointer text-xs font-semibold text-gray-700 dark:text-gray-300 list-none flex items-center gap-1 [&::-webkit-details-marker]:hidden"
			>
				<span class="text-gray-400 group-open:rotate-90 transition-transform inline-block">▸</span>
				Structured breakdown
			</summary>
			{#if data.proposal.statements.length === 0}
				<p class="text-xs text-gray-600 dark:text-gray-400 italic mt-2">No extracted lines in this response.</p>
			{:else}
				<ul class="space-y-1.5 max-h-48 overflow-y-auto mt-2" data-testid="{testIdPrefix}-statements">
					{#each data.proposal.statements as st}
						<li>
							<button
								type="button"
								class="w-full text-left rounded border px-2 py-1.5 transition text-xs {traceStatementId === st.statementId
									? 'border-teal-500 bg-teal-50/90 dark:border-teal-500 dark:bg-teal-900/35'
									: 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60'}"
								data-testid="{testIdPrefix}-stmt-row"
								data-statement-id={st.statementId}
								on:click={() => onStatementClick(st.statementId)}
							>
								<span class="block text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{st.verbatimText}</span>
								<span class="block text-[10px] text-gray-500 dark:text-gray-500 mt-0.5"
									>{st.statementId} · {st.statementType} · {st.sourceType} · {st.certainty}</span
								>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
			{#if data.proposal.conflicts.length > 0 || data.proposal.ambiguities.length > 0 || data.proposal.actions.length > 0 || data.proposal.issues.length > 0}
				<details class="mt-2 text-[10px]">
					<summary class="cursor-pointer text-gray-600 dark:text-gray-400 hover:underline">More extraction fields</summary>
					<div class="mt-1.5 space-y-1 text-gray-700 dark:text-gray-300">
						{#if data.proposal.conflicts.length > 0}
							<p class="font-semibold">Conflicts</p>
							<ul class="list-disc pl-4">
								{#each data.proposal.conflicts as c}
									<li>{c.conflictId} ({c.conflictKind}): {c.statementIds.join(', ')}</li>
								{/each}
							</ul>
						{/if}
						{#if data.proposal.ambiguities.length > 0}
							<p class="font-semibold">Ambiguities</p>
							<ul class="list-disc pl-4">
								{#each data.proposal.ambiguities as a}
									<li>({a.ambiguityType}) {a.verbatimText}</li>
								{/each}
							</ul>
						{/if}
						{#if data.proposal.actions.length > 0}
							<p class="font-semibold">Actions</p>
							<ul class="list-disc pl-4">
								{#each data.proposal.actions as ac}
									<li>{ac.verbatimText}</li>
								{/each}
							</ul>
						{/if}
						{#if data.proposal.issues.length > 0}
							<p class="font-semibold">Issues</p>
							<ul class="list-disc pl-4">
								{#each data.proposal.issues as iss}
									<li>({iss.issueType}) {iss.message}</li>
								{/each}
							</ul>
						{/if}
					</div>
				</details>
			{/if}
		</details>
	{/if}
</div>
