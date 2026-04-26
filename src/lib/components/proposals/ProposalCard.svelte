<!--
	Review workflow surface: four zones; candidate-only framing (no Timeline authority in copy).
-->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import {
		CalendarDaysIcon,
		DocumentTextIcon,
		EllipsisVerticalIcon,
		MapPinIcon,
		PhoneIcon,
		Square2StackIcon
	} from 'heroicons-svelte/24/outline';
	import { DS_BTN_CLASSES, DS_TYPE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import type { ProposalCardIconKey } from '$lib/case/proposalCardViewModel';
	import { PROPOSAL_CARD_PREVIEW_CAPTION } from '$lib/case/proposalCardViewModel';

	/** e.g. "Timeline Entry Proposal" */
	export let title: string;
	/** e.g. "TIMELINE" */
	export let typeChip: string;
	export let typeIcon: ProposalCardIconKey;
	/** e.g. "Created by Case Chat · {date}" */
	export let subline: string;
	/** Optional "Last reviewed" / "Recorded" line. */
	export let updateLine: string | null = null;
	/** Truncated preview; card applies line-clamp-3. */
	export let previewText: string;
	export let isExpanded: boolean;
	/** Shown in zone D. */
	export let statusChipLabel: string;
	export let reviewDisabled: boolean;
	export let rejectDisabled: boolean;
	export let reviewBusy: boolean;
	export let showReview = true;
	export let showReject = true;
	export let p128Presentation: boolean;
	/** P128 list contract: `data-p128-status-label` on the status chip when set. */
	export let p128DataStatusLabel: string | null = null;

	const dispatch = createEventDispatcher<{
		opendetail: void;
		reject: void;
	}>();
</script>

<div
	class="grid w-full min-w-0 grid-cols-1 items-start gap-3 sm:grid-cols-[2.25rem_1.05fr_1.05fr_10.5rem] sm:gap-3 sm:pt-0.5"
	data-testid="proposal-card-surface"
>
	<!-- A: type + icon -->
	<div class="flex flex-row items-center gap-2.5 sm:flex sm:flex-col sm:items-center sm:gap-1.5">
		<div
			class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[color:var(--ds-border-subtle)] bg-[color:var(--ds-bg-muted)] text-[color:var(--ds-text-secondary)]"
			aria-hidden="true"
		>
			{#if typeIcon === 'note'}
				<DocumentTextIcon class="h-5 w-5 opacity-90" />
			{:else if typeIcon === 'map'}
				<MapPinIcon class="h-5 w-5 opacity-90" />
			{:else if typeIcon === 'phone'}
				<PhoneIcon class="h-5 w-5 opacity-90" />
			{:else if typeIcon === 'timeline'}
				<CalendarDaysIcon class="h-5 w-5 opacity-90" />
			{:else}
				<Square2StackIcon class="h-5 w-5 opacity-90" />
			{/if}
		</div>
		<span
			class="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide
			       border border-[color:var(--ds-border-subtle)] text-[color:var(--ds-text-secondary)] sm:text-center"
		>
			{typeChip}
		</span>
	</div>

	<!-- B: title + metadata -->
	<div class="min-w-0 sm:min-h-[3.25rem]">
		<h3 class="m-0 text-sm font-semibold leading-snug text-[color:var(--ds-text-primary)]">
			{title}
		</h3>
		<p
			class="mt-0.5 m-0 text-[11px] leading-snug text-[color:var(--ds-text-muted)]"
			data-testid="proposal-card-subline"
		>
			{subline}
		</p>
		{#if updateLine}
			<p
				class="mt-0.5 m-0 text-[10px] leading-snug text-[color:var(--ds-text-muted)]"
				data-testid="proposal-card-update-line"
			>
				{updateLine}
			</p>
		{/if}
	</div>

	<!-- C: preview -->
	<div class="min-w-0 sm:min-h-[3.25rem]">
		<div
			class="text-[9px] font-semibold uppercase tracking-wider text-[color:var(--ds-text-muted)]"
			aria-label={PROPOSAL_CARD_PREVIEW_CAPTION}
		>
			{PROPOSAL_CARD_PREVIEW_CAPTION}
		</div>
		<div
			class="mt-1 text-[11px] leading-relaxed text-[color:var(--ds-text-primary)] [display:-webkit-box] line-clamp-3 overflow-hidden break-words font-mono
			       bg-[color:var(--ds-bg-muted)]/60 rounded border border-[color:var(--ds-border-subtle)] px-2 py-1.5"
			data-testid="proposal-preview"
		>
			{previewText || '—'}
		</div>
		<button
			type="button"
			class="mt-1.5 text-[10px] font-medium text-[color:var(--ds-accent)] underline decoration-[color:var(--ds-border-default)] underline-offset-2
			       hover:decoration-[color:var(--ds-accent)] disabled:cursor-not-allowed disabled:opacity-50"
			data-testid="proposal-card-view-more"
			disabled={reviewDisabled}
			on:click|stopPropagation={() => dispatch('opendetail')}
		>
			{isExpanded ? 'Show less' : 'View more'}
		</button>
	</div>

	<!-- D: status + actions -->
	<div
		class="flex min-w-0 flex-col items-stretch gap-2 sm:items-end sm:self-stretch sm:justify-between"
		data-testid="proposal-card-actions"
	>
		<span
			class="inline-flex w-fit max-w-full items-center rounded border border-[color:var(--ds-border-subtle)] bg-[color:var(--ds-bg-surface)]
			       px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[color:var(--ds-text-secondary)]"
			data-testid="status-badge"
			data-p128-status-label={p128DataStatusLabel === null ? undefined : p128DataStatusLabel}
		>
			{statusChipLabel}
		</span>
		<div class="flex flex-col items-stretch gap-1.5 sm:items-end">
			<div class="flex flex-wrap items-center justify-end gap-1.5">
				{#if showReview}
					<button
						type="button"
						class="{DS_BTN_CLASSES.primary} !min-h-8 !px-2.5 !text-[10px] !font-medium"
						data-testid="proposal-card-review"
						disabled={reviewDisabled || reviewBusy}
						title="Open full content and details for review (candidates only — not the official case record until accepted)"
						on:click|stopPropagation={() => dispatch('opendetail')}
					>
						{reviewBusy ? '…' : 'Review'}
					</button>
				{/if}
				{#if showReject}
					<button
						type="button"
						class="{DS_BTN_CLASSES.secondary} !min-h-8 !px-2.5 !text-[10px] !font-medium"
						data-testid="proposal-card-reject"
						disabled={rejectDisabled || reviewBusy}
						title="Reject this candidate (workflow only; not the official case record until committed)"
						on:click|stopPropagation={() => dispatch('reject')}
					>
						Reject
					</button>
				{/if}
			</div>
			<details class="group relative w-full sm:w-auto" data-testid="proposal-card-kebab">
				<summary
					class="list-none flex cursor-pointer items-center justify-end gap-0.5 text-[10px] text-[color:var(--ds-text-muted)]
					       hover:text-[color:var(--ds-text-secondary)] [&::-webkit-details-marker]:hidden"
					aria-label="More actions"
				>
					<EllipsisVerticalIcon class="h-4 w-4" />
					<span class="sr-only">More</span>
				</summary>
				<div
					class="absolute right-0 z-20 mt-0.5 min-w-[10rem] rounded-md border border-[color:var(--ds-border-default)]
					       bg-[color:var(--ds-bg-elevated)] py-1 text-left shadow-md"
					role="menu"
					on:click|stopPropagation
				>
					<slot name="kebab" />
					<div
						class="px-2 py-1.5 text-[9px] leading-snug text-[color:var(--ds-text-muted)] {DS_TYPE_CLASSES.meta}"
					>
						{p128Presentation
							? 'Additional actions; candidates only until accepted and committed on the governed path.'
							: 'Workflow actions; staging until commit — not the official case record on its own.'}
					</div>
				</div>
			</details>
		</div>
	</div>
</div>
