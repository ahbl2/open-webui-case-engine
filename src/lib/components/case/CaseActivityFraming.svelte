<!--
	P129-01 — Read-only Activity / audit identity (factual case history, not Timeline authority).
	Structural surface only: no DS_STATUS_SURFACE_* (no severity or urgency cues).
	Presentational: no stores, no data loading, no lifecycle hooks.
-->
<script lang="ts">
	import {
		DS_BANNER_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import {
		P129_ACTIVITY_FRAMING_BODY_NO_EVALUATION,
		P129_ACTIVITY_FRAMING_BODY_PRIMARY,
		P129_ACTIVITY_FRAMING_BODY_PROPOSALS,
		P129_ACTIVITY_FRAMING_BODY_TIMELINE,
		P129_ACTIVITY_SURFACE_TITLE
	} from '$lib/caseContext/p129ActivityFramingCopy';
</script>

<section
	class="{DS_BANNER_CLASSES.base} {DS_BANNER_CLASSES.denseModifier} shrink-0 border-b border-[color:var(--ce-l-border-strong)] border-l-[0.25rem] border-l-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-muted)] px-3 py-3 sm:px-4"
	aria-labelledby="case-activity-p129-audit-title"
	data-testid="case-activity-p129-framing"
	data-p129-activity-audit-framing="true"
>
	<h2
		id="case-activity-p129-audit-title"
		class="{DS_TYPE_CLASSES.section} m-0 text-sm font-medium text-[color:var(--ce-l-text-primary)]"
	>
		{P129_ACTIVITY_SURFACE_TITLE}
	</h2>
	<p
		class="{DS_BANNER_CLASSES.body} m-0 mt-1.5 text-xs leading-snug text-[color:var(--ce-l-text-muted)]"
	>
		{P129_ACTIVITY_FRAMING_BODY_PRIMARY}
	</p>
	<p
		class="{DS_BANNER_CLASSES.body} m-0 mt-1.5 text-xs leading-snug text-[color:var(--ce-l-text-muted)]"
	>
		{P129_ACTIVITY_FRAMING_BODY_TIMELINE}
	</p>
	<p
		class="{DS_BANNER_CLASSES.body} m-0 mt-1.5 text-xs leading-snug text-[color:var(--ce-l-text-muted)]"
	>
		{P129_ACTIVITY_FRAMING_BODY_PROPOSALS}
	</p>
	<p
		class="{DS_BANNER_CLASSES.body} m-0 mt-1.5 text-xs leading-snug text-[color:var(--ce-l-text-muted)]"
	>
		{P129_ACTIVITY_FRAMING_BODY_NO_EVALUATION}
	</p>
</section>
