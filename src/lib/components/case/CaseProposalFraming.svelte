<!--
	P128-01 — Non-authoritative Proposals intake identity (candidate Timeline entries).
	Aligned with Activity / Files hero: elevated surface, nav-sized title, disclosure for full doctrine.
	Presentational: no stores, no data loading, no lifecycle hooks.
-->
<script lang="ts">
	import {
		DS_BANNER_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import {
		P128_PROPOSALS_FRAMING_BODY_ACCEPTANCE,
		P128_PROPOSALS_FRAMING_BODY_EMPTY_REINFORCE,
		P128_PROPOSALS_FRAMING_BODY_PRIMARY,
		P128_PROPOSALS_FRAMING_BODY_SECONDARY,
		P128_PROPOSALS_FRAMING_BODY_TERTIARY,
		P128_PROPOSALS_FRAMING_DETAILS_TOGGLE,
		P128_PROPOSALS_HERO_LEAD,
		P128_PROPOSALS_HERO_TITLE
	} from '$lib/caseContext/p128ProposalFramingCopy';
	import { ChevronDownIcon, DocumentTextIcon } from 'heroicons-svelte/24/outline';
</script>

<section
	class="shrink-0 border-b border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-elevated)] px-3 py-3 sm:px-4"
	aria-labelledby="case-proposals-p128-hero-title"
	data-testid="case-proposals-p128-intake-framing"
	data-p128-proposals-intake-framing="true"
>
	<details class="group m-0">
		<summary
			class="flex cursor-pointer list-none flex-col gap-1.5 marker:content-none [&::-webkit-details-marker]:hidden"
		>
			<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
				<div class="flex min-w-0 flex-1 items-center gap-2">
					<DocumentTextIcon
						class="h-6 w-6 shrink-0 text-[color:var(--ce-l-text-muted)] sm:h-7 sm:w-7"
						aria-hidden="true"
					/>
					<div class="min-w-0">
						<h2
							id="case-proposals-p128-hero-title"
							class="m-0 min-w-0 text-lg font-semibold leading-snug tracking-tight text-[color:var(--ce-l-text-primary)] sm:text-xl"
						>
							{P128_PROPOSALS_HERO_TITLE}
						</h2>
						<p
							class="m-0 mt-0.5 max-w-3xl text-xs leading-snug text-[color:var(--ce-l-text-muted)] sm:text-sm"
						>
							{P128_PROPOSALS_HERO_LEAD}
						</p>
					</div>
				</div>
				<span
					class="inline-flex shrink-0 items-center gap-0.5 text-[color:var(--ce-l-text-muted)] underline-offset-2 group-open:underline {DS_TYPE_CLASSES.meta}"
				>
					{P128_PROPOSALS_FRAMING_DETAILS_TOGGLE}
					<ChevronDownIcon
						class="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180 sm:h-[1.125rem] sm:w-[1.125rem]"
						aria-hidden="true"
					/>
				</span>
			</div>
		</summary>
		<div class="mt-2 space-y-1.5 border-t border-[color:var(--ce-l-border-subtle)] pt-2 text-xs">
			<p class="{DS_BANNER_CLASSES.body} m-0 leading-snug text-[color:var(--ce-l-text-muted)]">
				{P128_PROPOSALS_FRAMING_BODY_PRIMARY}
			</p>
			<p class="{DS_BANNER_CLASSES.body} m-0 leading-snug text-[color:var(--ce-l-text-muted)]">
				{P128_PROPOSALS_FRAMING_BODY_SECONDARY}
			</p>
			<p class="{DS_BANNER_CLASSES.body} m-0 leading-snug text-[color:var(--ce-l-text-muted)]">
				{P128_PROPOSALS_FRAMING_BODY_TERTIARY}
			</p>
			<p class="{DS_BANNER_CLASSES.body} m-0 leading-snug text-[color:var(--ce-l-text-muted)]">
				{P128_PROPOSALS_FRAMING_BODY_ACCEPTANCE}
			</p>
			<p class="{DS_BANNER_CLASSES.body} m-0 leading-snug text-[color:var(--ce-l-text-muted)]">
				{P128_PROPOSALS_FRAMING_BODY_EMPTY_REINFORCE}
			</p>
		</div>
	</details>
</section>
