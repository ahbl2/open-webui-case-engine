<script lang="ts">
	/**
	 * Phase 96 — “What we know so far” read-only synthesis (`CaseSynthesisReadModel`).
	 * P96-02 layout · P96-03 traceability · P96-04 uncertainty · P96-05 consistency pass.
	 * P97-01 read-only synthesis → source navigation contract (no anchor/highlight here).
	 * Section order is fixed in markup; no mutation.
	 */
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import type { CaseSynthesisReadModel } from '$lib/case/caseSynthesisReadModel';
	import {
		intentFromSupportingContextItem,
		intentFromTimelineFact,
		navigateToSynthesisSource,
		synthesisSourceNavigateButtonText,
		synthesisSourceNavigateControlLabel,
		type SynthesisSourceNavigationIntent
	} from '$lib/case/caseSynthesisSourceNavigation';
	import { formatTraceIdLine } from '$lib/case/caseSynthesisTraceDisplay';
	import { formatOperationalCaseDateTime } from '$lib/utils/formatDateTime';
	import {
		DS_TYPE_CLASSES,
		DS_STACK_CLASSES,
		DS_SUMMARY_CLASSES,
		DS_STATUS_SURFACE_CLASSES,
		DS_BADGE_CLASSES,
		DS_CHIP_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';

	export let model: CaseSynthesisReadModel | null = null;
	export let loading = false;
	export let error: string | null = null;
	/** Optional override (tests); default uses `goto` + one-shot `state` handoff. */
	export let onSourceNavigate: ((intent: SynthesisSourceNavigationIntent) => void | Promise<void>) | undefined =
		undefined;

	async function emitSynthesisSourceNavigate(intent: SynthesisSourceNavigationIntent | null): Promise<void> {
		if (!browser || intent == null) return;
		if (onSourceNavigate) {
			await onSourceNavigate(intent);
		} else {
			await navigateToSynthesisSource(intent, goto);
		}
	}

	function supportTypeBadge(t: string): string {
		if (t === 'task') return 'Task';
		if (t === 'file') return 'File';
		if (t === 'extracted_text') return 'Extracted text';
		return t;
	}

	function supportTypeCaption(t: string): string {
		if (t === 'task') return 'Operational task (supporting — not Timeline)';
		if (t === 'file') return 'Case file (supporting — not Timeline)';
		if (t === 'extracted_text') return 'Extracted text (supporting — not Timeline)';
		return 'Support';
	}
</script>

{#if loading}
	<div
		class={DS_SUMMARY_CLASSES.loadingPanel}
		role="status"
		aria-live="polite"
		data-testid="synthesis-loading"
	>
		<p class="{DS_TYPE_CLASSES.body} font-semibold">Loading read-only synthesis…</p>
		<p class="{DS_TYPE_CLASSES.meta} mt-1">Reading Timeline, tasks, and files from Case Engine (no changes).</p>
	</div>
{:else if error}
	<div
		class="rounded-md px-3 py-2 text-sm {DS_STATUS_SURFACE_CLASSES.error}"
		role="alert"
		data-testid="synthesis-error"
	>
		<p class="ds-status-copy">{error}</p>
	</div>
{:else if model}
	<div
		class="{DS_STACK_CLASSES.stack} min-w-0"
		data-testid="case-synthesis-read-root"
		data-case-synthesis-ready="true"
	>
		<p class="{DS_TYPE_CLASSES.meta} max-w-2xl">
			Read-only layout from Case Engine data. This view is <span class="font-semibold">not</span> the official
			record—use <span class="font-semibold">Timeline</span> for the committed chronology.
		</p>

		<!-- 1 — Established facts (Timeline only; order fixed) -->
		<section
			class="{DS_SUMMARY_CLASSES.subpanel} {DS_STACK_CLASSES.tight}"
			data-testid="synthesis-section-established-facts"
			data-synthesis-section-order="1"
			aria-labelledby="synthesis-established-facts-heading"
		>
			<h3 id="synthesis-established-facts-heading" class={DS_TYPE_CLASSES.panel}>
				Established facts (from Timeline)
			</h3>
			<p class="{DS_TYPE_CLASSES.meta} text-[var(--ds-text-secondary)]">
				Authoritative Timeline entries only—chronological order preserved; rows are not merged or interpreted here.
			</p>
			{#if model.timeline_facts.length === 0}
				<p class="{DS_TYPE_CLASSES.body} {DS_SUMMARY_CLASSES.emptyDashed}" data-testid="synthesis-empty-established">
					No Timeline entries in this read-only layout.
				</p>
			{:else}
				<ul class="{DS_STACK_CLASSES.stack} list-none p-0 m-0" role="list" data-testid="synthesis-established-facts-list">
					{#each model.timeline_facts as fact (fact.entry_id)}
						{@const timelineNavIntent = intentFromTimelineFact(model.case_id, fact)}
						<li
							class="rounded-md border border-[color-mix(in_oklab,var(--ds-border)_85%,transparent)] bg-[color-mix(in_oklab,var(--ds-surface-elevated)_92%,transparent)] px-3 py-2.5"
							data-testid="synthesis-timeline-fact-row"
							data-entry-id={fact.entry_id}
						>
							<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
								<time
									class="{DS_TYPE_CLASSES.label} text-[var(--ds-text-primary)] shrink-0"
									datetime={fact.occurred_at}
								>
									{formatOperationalCaseDateTime(fact.occurred_at)}
								</time>
								<span
									class="{DS_BADGE_CLASSES.base} {DS_BADGE_CLASSES.neutral}"
									title="Derived from a committed Timeline entry — not a substitute for the Timeline tab."
								>
									Timeline entry
								</span>
							</div>
							<p class="{DS_TYPE_CLASSES.body} mt-1.5 whitespace-pre-wrap break-words">{fact.summary_text || '—'}</p>
							<div
								class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-[color-mix(in_oklab,var(--ds-border)_70%,transparent)] pt-2"
								data-testid="synthesis-fact-citation"
							>
								<span class="{DS_TYPE_CLASSES.label} text-[var(--ds-text-secondary)]">Source reference</span>
								<span class="{DS_CHIP_CLASSES.base} {DS_TYPE_CLASSES.mono} text-xs" title="Timeline entry id"
									>{fact.entry_id}</span>
								<span class="{DS_TYPE_CLASSES.meta}">Same entry as Timeline—this row is read-only display.</span>
							</div>
							{#if timelineNavIntent}
								<div class="mt-2 flex flex-col gap-1" data-testid="synthesis-timeline-fact-nav">
									<button
										type="button"
										class="inline-flex w-fit max-w-full items-center rounded border border-[color-mix(in_oklab,var(--ds-border)_78%,transparent)] bg-[color-mix(in_oklab,var(--ds-surface)_92%,transparent)] px-2.5 py-1 text-xs font-medium text-[var(--ds-text-primary)] hover:bg-[color-mix(in_oklab,var(--ds-surface-elevated)_90%,transparent)]"
										data-testid="synthesis-nav-to-source"
										data-synthesis-source-authority="authoritative"
										data-synthesis-source-kind="timeline_entry"
										data-synthesis-source-record-id={fact.entry_id}
										aria-label={synthesisSourceNavigateControlLabel(timelineNavIntent)}
										on:click={() => void emitSynthesisSourceNavigate(timelineNavIntent)}
									>
										{synthesisSourceNavigateButtonText(timelineNavIntent)}
									</button>
									<p class="{DS_TYPE_CLASSES.meta} text-[var(--ds-text-secondary)]">
										Opens the Timeline tab for this entry id. This synthesis row is derived display only.
									</p>
								</div>
							{:else}
								<p
									class="{DS_TYPE_CLASSES.meta} mt-2 text-[var(--ds-status-error-fg)]"
									data-testid="synthesis-timeline-nav-unavailable"
									role="status"
								>
									Source navigation is unavailable for this row (missing entry id).
								</p>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<!-- 2 — Supporting context (never authoritative) -->
		<section
			class="{DS_SUMMARY_CLASSES.subpanel} {DS_STACK_CLASSES.tight} opacity-95"
			data-testid="synthesis-section-supporting-context"
			data-synthesis-section-order="2"
			aria-labelledby="synthesis-supporting-heading"
		>
			<h3 id="synthesis-supporting-heading" class={DS_TYPE_CLASSES.panel}>
				Supporting context (not Timeline)
			</h3>
			<p class="{DS_TYPE_CLASSES.meta} text-[var(--ds-text-secondary)]">
				Operational tasks, files, and extracted text—supporting evidence only; not chronological authority.
			</p>
			{#if model.supporting_context.length === 0}
				<p class="{DS_TYPE_CLASSES.body} {DS_SUMMARY_CLASSES.emptyDashed}" data-testid="synthesis-empty-supporting">
					No supporting items in this read-only layout.
				</p>
			{:else}
				<ul class="{DS_STACK_CLASSES.stack} list-none p-0 m-0" role="list" data-testid="synthesis-supporting-list">
					{#each model.supporting_context as item, itemIdx (item.source_type + ':' + item.source_id + ':' + itemIdx)}
						{@const supportNavIntent = intentFromSupportingContextItem(model.case_id, item)}
						<li
							class="rounded-md border border-dashed border-[color-mix(in_oklab,var(--ds-border)_70%,transparent)] px-3 py-2"
							data-testid="synthesis-supporting-row"
							data-support-type={item.source_type}
						>
							<div
								class="flex flex-wrap items-center gap-x-2 gap-y-1"
								data-testid="synthesis-support-citation"
							>
								<span
									class="{DS_BADGE_CLASSES.base} {DS_BADGE_CLASSES.neutral} opacity-90"
									title={supportTypeCaption(item.source_type)}
								>
									{supportTypeBadge(item.source_type)}
								</span>
								<span class="{DS_TYPE_CLASSES.label} text-[var(--ds-text-secondary)]">ID</span>
								<span class="{DS_CHIP_CLASSES.base} {DS_TYPE_CLASSES.mono} text-xs">{item.source_id}</span>
							</div>
							<p class="{DS_TYPE_CLASSES.meta} mt-1 text-[var(--ds-text-secondary)]">{supportTypeCaption(item.source_type)}</p>
							<p class="{DS_TYPE_CLASSES.body} mt-1 text-[var(--ds-text-secondary)] whitespace-pre-wrap break-words">
								{item.reference_text || '—'}
							</p>
							{#if supportNavIntent}
								<div class="mt-2 flex flex-col gap-1" data-testid="synthesis-supporting-nav">
									<button
										type="button"
										class="inline-flex w-fit max-w-full items-center rounded border border-[color-mix(in_oklab,var(--ds-border)_78%,transparent)] bg-[color-mix(in_oklab,var(--ds-surface)_94%,transparent)] px-2.5 py-1 text-xs font-medium text-[var(--ds-text-primary)] hover:bg-[color-mix(in_oklab,var(--ds-surface-elevated)_88%,transparent)]"
										data-testid="synthesis-nav-to-source"
										data-synthesis-source-authority="supporting"
										data-synthesis-source-kind={supportNavIntent.source_kind}
										data-synthesis-source-record-id={item.source_id}
										aria-label={synthesisSourceNavigateControlLabel(supportNavIntent)}
										on:click={() => void emitSynthesisSourceNavigate(supportNavIntent)}
									>
										{synthesisSourceNavigateButtonText(supportNavIntent)}
									</button>
									<p class="{DS_TYPE_CLASSES.meta} text-[var(--ds-text-secondary)]">
										Supporting record only—not Timeline chronology.
									</p>
								</div>
							{:else}
								<p
									class="{DS_TYPE_CLASSES.meta} mt-2 text-[var(--ds-status-error-fg)]"
									data-testid="synthesis-supporting-nav-unavailable"
									role="status"
								>
									Source navigation is unavailable for this supporting row (missing id).
								</p>
							{/if}
							{#if item.relation_hint}
								<p class="{DS_TYPE_CLASSES.meta} mt-1.5 border-t border-dashed border-[color-mix(in_oklab,var(--ds-border)_55%,transparent)] pt-1.5 opacity-85">
									<span class="font-medium">Support pointer:</span>
									{item.relation_hint}
								</p>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<!-- 3 — Gaps / unknowns -->
		<section
			class="{DS_SUMMARY_CLASSES.subpanel} {DS_STACK_CLASSES.tight}"
			data-testid="synthesis-section-gaps-unknowns"
			data-synthesis-section-order="3"
			aria-labelledby="synthesis-gaps-heading"
		>
			<h3 id="synthesis-gaps-heading" class={DS_TYPE_CLASSES.panel}>Gaps and unknowns</h3>
			<p class="{DS_TYPE_CLASSES.meta} text-[var(--ds-text-secondary)]">
				Not part of the official record. Items here flag unanswered areas, incomplete coverage, or ambiguity in
				this read-only layout—not settled facts.
			</p>
			{#if model.gaps_and_unknowns.length === 0}
				<p class="{DS_TYPE_CLASSES.body} {DS_SUMMARY_CLASSES.emptyDashed}" data-testid="synthesis-empty-gaps">
					No gap rows in this read model. That does not mean the picture is complete—only that this layout has
					nothing extra to list here.
				</p>
			{:else}
				<ul class="{DS_STACK_CLASSES.stack} list-none p-0 m-0" role="list" data-testid="synthesis-gaps-list">
					{#each model.gaps_and_unknowns as gap, i (i + gap.description)}
						<li
							class="rounded-md px-3 py-2 bg-[color-mix(in_oklab,var(--ds-status-warning-bg)_28%,transparent)] border border-[color-mix(in_oklab,var(--ds-border)_80%,transparent)]"
							data-testid="synthesis-gap-row"
							data-synthesis-gap-state={gap.related_source_ids.length > 0 ? 'linked-refs' : 'no-linked-refs'}
						>
							<div class="mb-1.5 flex flex-wrap items-center gap-2">
								{#if gap.related_source_ids.length > 0}
									<span
										class="{DS_BADGE_CLASSES.base} {DS_BADGE_CLASSES.neutral}"
										data-testid="synthesis-gap-state-linked-refs"
										title="Linked material exists in this read model; it does not establish a settled fact here."
									>
										Ambiguous / mixed support
									</span>
								{:else}
									<span
										class="{DS_BADGE_CLASSES.base} {DS_BADGE_CLASSES.neutral}"
										data-testid="synthesis-gap-state-no-refs"
										title="Unanswered or incomplete in this view—no linked IDs attached to this gap row."
									>
										Unknown / unanswered
									</span>
								{/if}
							</div>
							<p class="{DS_TYPE_CLASSES.body} text-[var(--ds-text-primary)]">{gap.description}</p>
							<div class="mt-2 space-y-1.5" data-testid="synthesis-gap-traceability">
								{#if gap.related_source_ids.length > 0}
									<p class="{DS_TYPE_CLASSES.label} text-[var(--ds-text-secondary)]">
										Linked references (context only)
									</p>
									<div class="flex flex-wrap gap-1.5" data-testid="synthesis-gap-related-ids">
										{#each gap.related_source_ids as rid (rid)}
											<span class="{DS_CHIP_CLASSES.base} {DS_TYPE_CLASSES.mono} text-xs">{rid}</span>
										{/each}
									</div>
									<p class="{DS_TYPE_CLASSES.meta}" data-testid="synthesis-gap-linked-framing">
										These links are context only; they do not resolve this gap in this view.
									</p>
									<p class="{DS_TYPE_CLASSES.meta} mt-1.5" data-testid="synthesis-gap-refs-nav-unavailable">
										These ids are not typed for source navigation from this gap row—open Timeline, Tasks, or Files
										and locate the record by id if needed.
									</p>
								{:else}
									<p class="{DS_TYPE_CLASSES.label} text-[var(--ds-text-secondary)]">Source references</p>
									<p class="{DS_TYPE_CLASSES.meta}" data-testid="synthesis-gap-no-source-refs">
										No linked source references in this read model.
									</p>
									<p class="{DS_TYPE_CLASSES.meta}" data-testid="synthesis-gap-no-refs-framing">
										This does not prove absence elsewhere in the case or that nothing relevant exists.
									</p>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<!-- 4 — Trace (inspection) -->
		<section
			class="{DS_SUMMARY_CLASSES.subpanel} {DS_STACK_CLASSES.tight}"
			data-testid="synthesis-section-trace-summary"
			data-synthesis-section-order="4"
			aria-labelledby="synthesis-trace-heading"
		>
			<h3 id="synthesis-trace-heading" class={DS_TYPE_CLASSES.panel}>
				Source references (inspection)
			</h3>
			<p class="{DS_TYPE_CLASSES.meta} text-[var(--ds-text-secondary)]">
				IDs from this read model only—counts and lists for inspection; same authority rules as sections above.
			</p>
			<dl class="grid gap-3 text-sm {DS_TYPE_CLASSES.meta}" data-testid="synthesis-trace-block">
				<div>
					<div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
						<dt class="text-[var(--ds-text-secondary)] font-sans">Timeline entry IDs</dt>
						<dd class="font-sans font-medium text-[var(--ds-text-primary)]"
							>{model.trace.timeline_entry_ids.length}</dd
						>
					</div>
					{#if model.trace.timeline_entry_ids.length > 0}
						<p class="mt-1 break-all font-mono text-xs opacity-90" data-testid="synthesis-trace-ids-timeline">
							{formatTraceIdLine(model.trace.timeline_entry_ids)}
						</p>
					{:else}
						<p class="mt-1 {DS_TYPE_CLASSES.meta}" data-testid="synthesis-trace-ids-timeline-empty">None.</p>
					{/if}
				</div>
				<div>
					<div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
						<dt class="text-[var(--ds-text-secondary)] font-sans">Task IDs</dt>
						<dd class="font-sans font-medium text-[var(--ds-text-primary)]">{model.trace.task_ids.length}</dd>
					</div>
					{#if model.trace.task_ids.length > 0}
						<p class="mt-1 break-all font-mono text-xs opacity-90" data-testid="synthesis-trace-ids-tasks">
							{formatTraceIdLine(model.trace.task_ids)}
						</p>
					{:else}
						<p class="mt-1 {DS_TYPE_CLASSES.meta}" data-testid="synthesis-trace-ids-tasks-empty">None.</p>
					{/if}
				</div>
				<div>
					<div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
						<dt class="text-[var(--ds-text-secondary)] font-sans">File IDs</dt>
						<dd class="font-sans font-medium text-[var(--ds-text-primary)]">{model.trace.file_ids.length}</dd>
					</div>
					{#if model.trace.file_ids.length > 0}
						<p class="mt-1 break-all font-mono text-xs opacity-90" data-testid="synthesis-trace-ids-files">
							{formatTraceIdLine(model.trace.file_ids)}
						</p>
					{:else}
						<p class="mt-1 {DS_TYPE_CLASSES.meta}" data-testid="synthesis-trace-ids-files-empty">None.</p>
					{/if}
				</div>
			</dl>
		</section>
	</div>
{:else}
	<p class={DS_TYPE_CLASSES.meta} data-testid="synthesis-placeholder">—</p>
{/if}
