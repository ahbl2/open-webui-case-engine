<!--
	P129-04 — Read-only factual fields from `CaseActivityEvent` (no fetch, no stores).
-->
<script lang="ts">
	import type { CaseActivityEvent } from '$lib/apis/caseEngine/caseP129ActivityEventsApi';
	import {
		DS_BANNER_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import { p129ActivityEventTypeLabel, p129ActivityMetadataLines } from '$lib/case/p129ActivityDisplay';
	import {
		P129_ACTIVITY_DETAIL_LABEL_ACTOR,
		P129_ACTIVITY_DETAIL_LABEL_EVENT_ID,
		P129_ACTIVITY_DETAIL_LABEL_EVENT_TYPE,
		P129_ACTIVITY_DETAIL_LABEL_OCCURRED_AT,
		P129_ACTIVITY_DETAIL_LABEL_RECORDED_AT,
		P129_ACTIVITY_DETAIL_LABEL_TARGET_ID,
		P129_ACTIVITY_DETAIL_LABEL_TARGET_TYPE,
		P129_ACTIVITY_DETAIL_METADATA_HEADING,
		P129_ACTIVITY_DETAIL_PANEL_TITLE
	} from '$lib/caseContext/p129ActivityDetailCopy';
	import { formatCaseDateTimeWithSeconds } from '$lib/utils/formatDateTime';

	export let event: CaseActivityEvent;
	/** Nested under activity feed card — lighter chrome. */
	export let embedded = false;

	$: showRecorded =
		event.recorded_at &&
		event.occurred_at &&
		String(event.recorded_at).trim() !== String(event.occurred_at).trim();
</script>

<section
	class="{embedded
		? 'mt-0 rounded-md border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-muted)] px-3 py-2.5'
		: `${DS_BANNER_CLASSES.base} ${DS_BANNER_CLASSES.denseModifier} mt-2 border border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-raised)] px-3 py-2.5`}"
	data-testid="case-activity-event-detail"
	aria-label={P129_ACTIVITY_DETAIL_PANEL_TITLE}
	data-embedded={embedded ? 'true' : undefined}
>
	<p class="{DS_TYPE_CLASSES.section} m-0 text-xs font-normal text-[color:var(--ce-l-text-primary)]">
		{P129_ACTIVITY_DETAIL_PANEL_TITLE}
	</p>
	<dl class="m-0 mt-2 space-y-1.5">
		<div>
			<dt class="{DS_TYPE_CLASSES.meta} m-0 text-[color:var(--ce-l-text-muted)]">
				{P129_ACTIVITY_DETAIL_LABEL_EVENT_TYPE}
			</dt>
			<dd class="{DS_TYPE_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-primary)]">
				{p129ActivityEventTypeLabel(event.event_type)}
			</dd>
		</div>
		<div>
			<dt class="{DS_TYPE_CLASSES.meta} m-0 text-[color:var(--ce-l-text-muted)]">
				{P129_ACTIVITY_DETAIL_LABEL_EVENT_ID}
			</dt>
			<dd class="{DS_TYPE_CLASSES.mono} m-0 text-xs text-[color:var(--ce-l-text-primary)]">
				{event.event_id}
			</dd>
		</div>
		<div>
			<dt class="{DS_TYPE_CLASSES.meta} m-0 text-[color:var(--ce-l-text-muted)]">
				{P129_ACTIVITY_DETAIL_LABEL_OCCURRED_AT}
			</dt>
			<dd class="{DS_TYPE_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-primary)]">
				{formatCaseDateTimeWithSeconds(event.occurred_at)}
			</dd>
		</div>
		{#if showRecorded}
			<div>
				<dt class="{DS_TYPE_CLASSES.meta} m-0 text-[color:var(--ce-l-text-muted)]">
					{P129_ACTIVITY_DETAIL_LABEL_RECORDED_AT}
				</dt>
				<dd class="{DS_TYPE_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-primary)]">
					{formatCaseDateTimeWithSeconds(event.recorded_at)}
				</dd>
			</div>
		{/if}
		<div>
			<dt class="{DS_TYPE_CLASSES.meta} m-0 text-[color:var(--ce-l-text-muted)]">
				{P129_ACTIVITY_DETAIL_LABEL_ACTOR}
			</dt>
			<dd class="{DS_TYPE_CLASSES.mono} m-0 text-xs text-[color:var(--ce-l-text-primary)]">
				{event.actor_user_id}
			</dd>
		</div>
		<div>
			<dt class="{DS_TYPE_CLASSES.meta} m-0 text-[color:var(--ce-l-text-muted)]">
				{P129_ACTIVITY_DETAIL_LABEL_TARGET_TYPE}
			</dt>
			<dd class="{DS_TYPE_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-primary)]">
				{event.target_type}
			</dd>
		</div>
		<div>
			<dt class="{DS_TYPE_CLASSES.meta} m-0 text-[color:var(--ce-l-text-muted)]">
				{P129_ACTIVITY_DETAIL_LABEL_TARGET_ID}
			</dt>
			<dd class="{DS_TYPE_CLASSES.mono} m-0 text-xs text-[color:var(--ce-l-text-primary)]">
				{event.target_id}
			</dd>
		</div>
	</dl>
	{#if event.metadata && Object.keys(event.metadata).length > 0}
		{@const metaLines = p129ActivityMetadataLines(event.metadata)}
		{#if metaLines.length > 0}
			<p class="{DS_TYPE_CLASSES.meta} m-0 mt-2 text-[color:var(--ce-l-text-muted)]">
				{P129_ACTIVITY_DETAIL_METADATA_HEADING}
			</p>
			<ul class="m-0 mt-1 list-none space-y-0.5 p-0">
				{#each metaLines as line, i (i)}
					<li class="{DS_TYPE_CLASSES.mono} text-xs text-[color:var(--ce-l-text-primary)]">{line}</li>
				{/each}
			</ul>
		{/if}
	{/if}
</section>
