<!--
	P129-01 — Read-only Activity / audit identity (factual case history, not Timeline authority).
	Presentational: compact disclosure; Activity title sized to align with case name in CaseWorkspaceHeader.
-->
<script lang="ts">
	import {
		DS_BANNER_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import {
		P129_ACTIVITY_FRAMING_BODY_COVERAGE,
		P129_ACTIVITY_FRAMING_BODY_NO_EVALUATION,
		P129_ACTIVITY_FRAMING_BODY_PRIMARY,
		P129_ACTIVITY_FRAMING_BODY_PROPOSALS,
		P129_ACTIVITY_FRAMING_BODY_TIMELINE,
		P129_ACTIVITY_FRAMING_DETAILS_TOGGLE,
		P129_ACTIVITY_FRAMING_INLINE_HINT,
		P129_ACTIVITY_FRAMING_LEAD,
		P129_ACTIVITY_SURFACE_TITLE
	} from '$lib/caseContext/p129ActivityFramingCopy';
	import { ChevronDownIcon, ClockIcon } from 'heroicons-svelte/24/outline';
</script>

<section
	class="shrink-0 border-b border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-elevated)] px-3 py-2 sm:px-4"
	aria-labelledby="case-activity-p129-audit-title"
	data-testid="case-activity-p129-framing"
	data-p129-activity-audit-framing="true"
>
	<details class="group m-0">
		<summary
			class="flex cursor-pointer list-none flex-col gap-1.5 marker:content-none [&::-webkit-details-marker]:hidden"
		>
			<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
				<div class="flex min-w-0 flex-1 items-center gap-2">
					<ClockIcon
						class="h-5 w-5 shrink-0 text-[color:var(--ce-l-text-muted)] sm:h-6 sm:w-6"
						aria-hidden="true"
					/>
					<h2
						id="case-activity-p129-audit-title"
						class="min-w-0 flex-1 font-semibold leading-snug tracking-tight text-[color:var(--ce-l-text-primary)] text-lg sm:text-xl"
					>
						{P129_ACTIVITY_SURFACE_TITLE}
					</h2>
				</div>
				<span
					class="inline-flex shrink-0 items-center gap-0.5 text-[color:var(--ce-l-text-muted)] underline-offset-2 group-open:underline {DS_TYPE_CLASSES.meta}"
				>
					{P129_ACTIVITY_FRAMING_DETAILS_TOGGLE}
					<ChevronDownIcon
						class="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180 sm:h-[1.125rem] sm:w-[1.125rem]"
						aria-hidden="true"
					/>
				</span>
			</div>
			<p
				class="m-0 min-w-0 pl-7 text-xs leading-snug text-[color:var(--ce-l-text-muted)] sm:pl-8"
				title={P129_ACTIVITY_FRAMING_LEAD}
			>
				— {P129_ACTIVITY_FRAMING_INLINE_HINT}
			</p>
		</summary>
		<div class="mt-2 space-y-1.5 border-t border-[color:var(--ce-l-border-subtle)] pt-2 text-xs">
			<p class="{DS_BANNER_CLASSES.body} m-0 leading-snug text-[color:var(--ce-l-text-muted)]">
				{P129_ACTIVITY_FRAMING_BODY_PRIMARY}
			</p>
			<p class="{DS_BANNER_CLASSES.body} m-0 leading-snug text-[color:var(--ce-l-text-muted)]">
				{P129_ACTIVITY_FRAMING_BODY_TIMELINE}
			</p>
			<p class="{DS_BANNER_CLASSES.body} m-0 leading-snug text-[color:var(--ce-l-text-muted)]">
				{P129_ACTIVITY_FRAMING_BODY_PROPOSALS}
			</p>
			<p class="{DS_BANNER_CLASSES.body} m-0 leading-snug text-[color:var(--ce-l-text-muted)]">
				{P129_ACTIVITY_FRAMING_BODY_NO_EVALUATION}
			</p>
			<p class="{DS_BANNER_CLASSES.body} m-0 leading-snug text-[color:var(--ce-l-text-muted)]">
				{P129_ACTIVITY_FRAMING_BODY_COVERAGE}
			</p>
		</div>
	</details>
</section>
