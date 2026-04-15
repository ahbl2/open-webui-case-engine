<!--
	P128-03 — Read-only proposal detail: stored fields only; no editors, no guidance surfaces.
-->
<script lang="ts">
	import type { ProposalRecord } from '$lib/apis/caseEngine';
	import { formatCaseDateTime } from '$lib/utils/formatDateTime';
	import { p128StatusDisplayLabel } from '$lib/caseContext/p128ProposalDisplay';
	import { P128_DETAIL_SECTION_TITLE } from '$lib/caseContext/p128ProposalListCopy';
	import { P128_CHRONO_CONFIRM_BUTTON } from '$lib/caseContext/p128ProposalReviewCopy';
	import { DS_BTN_CLASSES, DS_TYPE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';

	export let proposal: ProposalRecord;
	/** P128-04 — show explicit chronology confirm when low confidence blocks acceptance. */
	export let showChronologyConfirm = false;
	export let chronologyConfirmBusy = false;
	export let onConfirmChronology: (() => void) | undefined = undefined;

	function shortId(id: string): string {
		return id.slice(0, 8) + '…';
	}

	function parsePayload(raw: string): Record<string, unknown> {
		try {
			return JSON.parse(raw) as Record<string, unknown>;
		} catch {
			return {};
		}
	}

	$: payload = parsePayload(proposal.proposed_payload);
</script>

<div class="space-y-3" data-testid="case-proposal-detail-readonly">
	<div
		class="flex flex-wrap gap-x-3 gap-y-1 text-[10px] leading-snug border-b border-[color:var(--ds-border-subtle)] pb-2"
	>
		<span class="{DS_TYPE_CLASSES.meta}">
			<span class="font-semibold text-[color:var(--ds-text-primary)]">Status:</span>
			{p128StatusDisplayLabel(proposal.status)}
		</span>
		<span class="{DS_TYPE_CLASSES.meta}">
			<span class="font-semibold text-[color:var(--ds-text-primary)]">Type:</span>
			{proposal.proposal_type}
		</span>
		<span class="{DS_TYPE_CLASSES.meta}">
			<span class="font-semibold text-[color:var(--ds-text-primary)]">Created:</span>
			{formatCaseDateTime(proposal.created_at)}
		</span>
		<span class="{DS_TYPE_CLASSES.meta}">
			<span class="font-semibold text-[color:var(--ds-text-primary)]">Created by:</span>
			<span class="font-mono">{proposal.created_by}</span>
		</span>
		{#if proposal.reviewed_at}
			<span class="{DS_TYPE_CLASSES.meta}">
				<span class="font-semibold text-[color:var(--ds-text-primary)]">Reviewed:</span>
				{formatCaseDateTime(proposal.reviewed_at)}
			</span>
		{/if}
		{#if proposal.reviewed_by}
			<span class="{DS_TYPE_CLASSES.meta}">
				<span class="font-semibold text-[color:var(--ds-text-primary)]">Reviewed by:</span>
				<span class="font-mono">{proposal.reviewed_by}</span>
			</span>
		{/if}
		{#if proposal.committed_at}
			<span class="{DS_TYPE_CLASSES.meta}">
				<span class="font-semibold text-[color:var(--ds-text-primary)]">Committed at:</span>
				{formatCaseDateTime(proposal.committed_at)}
			</span>
		{/if}
	</div>

	{#if showChronologyConfirm && onConfirmChronology}
		<div
			class="rounded border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/25 px-2 py-2 text-[10px] text-amber-950 dark:text-amber-100"
			data-testid="p128-chronology-confirm-panel"
		>
			<p class="m-0 mb-2 leading-snug">
				Date and time for this entry must be confirmed before it can be accepted.
			</p>
			<button
				type="button"
				class="{DS_BTN_CLASSES.secondary} text-[10px] px-2 py-0.5"
				disabled={chronologyConfirmBusy}
				on:click={() => onConfirmChronology?.()}
			>
				{chronologyConfirmBusy ? '…' : P128_CHRONO_CONFIRM_BUTTON}
			</button>
		</div>
	{/if}

	<p class="text-[9px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 m-0">
		{P128_DETAIL_SECTION_TITLE}
	</p>

	{#if proposal.proposal_type === 'note'}
		<div class="space-y-2 text-[11px] text-gray-800 dark:text-gray-200">
			{#if payload.title}
				<div class="flex gap-2 items-start">
					<span class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 w-20 shrink-0">Title</span>
					<span class="flex-1 whitespace-pre-wrap break-words">{String(payload.title)}</span>
				</div>
			{/if}
			{#if payload.text_original != null && String(payload.text_original).trim() !== ''}
				<div class="flex gap-2 items-start">
					<span class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 w-20 shrink-0">Original</span>
					<span class="flex-1 whitespace-pre-wrap break-words font-mono leading-relaxed">{String(payload.text_original)}</span>
				</div>
			{/if}
			<div class="flex gap-2 items-start">
				<span class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 w-20 shrink-0">
					{payload.text_original ? 'Cleaned' : 'Content'}
				</span>
				<span class="flex-1 whitespace-pre-wrap break-words font-mono leading-relaxed">{payload.content ?? '—'}</span>
			</div>
		</div>
	{:else if proposal.proposal_type === 'timeline'}
		<div class="space-y-2 text-[11px] text-gray-800 dark:text-gray-200">
			<div class="flex gap-2 items-start">
				<span class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 w-24 shrink-0">Occurred at</span>
				<span class="flex-1 whitespace-pre-wrap break-words font-mono" data-testid="p128-detail-occurred-at">
					{payload.occurred_at != null ? String(payload.occurred_at) : '—'}
				</span>
			</div>
			<div class="flex gap-2 items-start">
				<span class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 w-24 shrink-0">Entry type</span>
				<span class="flex-1">{payload.type != null ? String(payload.type) : '—'}</span>
			</div>
			<div class="flex gap-2 items-start">
				<span class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 w-24 shrink-0">Text</span>
				<span class="flex-1 whitespace-pre-wrap break-words font-mono leading-relaxed" data-testid="p128-detail-text-original">
					{payload.text_original != null ? String(payload.text_original) : '—'}
				</span>
			</div>
			{#if payload.text_cleaned != null && String(payload.text_cleaned).trim() !== ''}
				<div class="flex gap-2 items-start">
					<span class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 w-24 shrink-0">Cleaned</span>
					<span class="flex-1 whitespace-pre-wrap break-words font-mono leading-relaxed">{String(payload.text_cleaned)}</span>
				</div>
			{/if}
			{#if Array.isArray(payload.tags) && payload.tags.length > 0}
				<div class="flex gap-2 items-start">
					<span class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 w-24 shrink-0">Tags</span>
					<span class="flex-1">{payload.tags.map((t: unknown) => String(t)).join(', ')}</span>
				</div>
			{/if}
			{#if payload.location_text}
				<div class="flex gap-2 items-start">
					<span class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 w-24 shrink-0">Location</span>
					<span class="flex-1 whitespace-pre-wrap break-words">{String(payload.location_text)}</span>
				</div>
			{/if}
			{#if payload.source_type === 'case_file' && payload.source_reference_id}
				<div class="flex gap-2 items-start">
					<span class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 w-24 shrink-0">Source file</span>
					<span class="flex-1 break-all">{String(payload.source_document_filename ?? payload.source_reference_id)}</span>
				</div>
			{/if}
		</div>
	{:else}
		<pre
			class="text-[10px] text-gray-600 dark:text-gray-400 font-mono whitespace-pre-wrap break-all m-0"
			data-testid="p128-detail-unknown-payload">{JSON.stringify(payload, null, 2)}</pre>
	{/if}

	{#if proposal.rejection_reason}
		<div class="text-[10px] text-gray-700 dark:text-gray-300 pt-2 border-t border-[color:var(--ds-border-subtle)]">
			<span class="font-semibold">Rejection reason:</span>
			{proposal.rejection_reason}
		</div>
	{/if}

	{#if proposal.committed_record_id}
		<div class="text-[10px] text-gray-700 dark:text-gray-300">
			<span class="font-semibold"
				>{proposal.proposal_type === 'timeline' ? 'Timeline entry id:' : 'Note record id:'}</span
			>
			<span class="font-mono">{proposal.committed_record_id}</span>
		</div>
	{/if}

	<div
		class="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-gray-500 dark:text-gray-400 pt-2 border-t border-[color:var(--ds-border-subtle)]"
	>
		<span>
			<span class="font-semibold">Source scope:</span>
			{proposal.source_scope}
		</span>
		<span>
			<span class="font-semibold">Thread:</span>
			<span class="font-mono">{shortId(proposal.source_thread_id)}</span>
		</span>
		{#if proposal.source_message_id}
			<span>
				<span class="font-semibold">Message:</span>
				<span class="font-mono">{shortId(proposal.source_message_id)}</span>
			</span>
		{/if}
		<span>
			<span class="font-semibold">Proposal id:</span>
			<span class="font-mono">{proposal.id}</span>
		</span>
	</div>
</div>
