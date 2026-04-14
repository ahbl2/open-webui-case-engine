<!--
	P127-01 — Non-authoritative Workflow identity (operational tracking). Distinct from Timeline neutral,
	Notes info, Files success, Entities warning — uses structural raised surface only (no ds-status-surface-*).
	No stores, no data, no conditional framing.
-->
<script lang="ts">
	import {
		DS_BANNER_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import {
		P127_WORKFLOW_FRAMING_BODY_PRIMARY,
		P127_WORKFLOW_FRAMING_BODY_SECONDARY,
		P127_WORKFLOW_FRAMING_BODY_TERTIARY,
		P127_WORKFLOW_SURFACE_TITLE
	} from '$lib/caseContext/p127WorkflowFramingCopy';
</script>

<section
	class="{DS_BANNER_CLASSES.base} {DS_BANNER_CLASSES.denseModifier} shrink-0 border-b border-[color:var(--ce-l-border-strong)] bg-[color:var(--ce-l-surface-raised)] px-3 py-3 sm:px-4"
	aria-labelledby="case-workflow-p127-operational-title"
	data-testid="case-workflow-p127-operational-framing"
	data-p127-workflow-operational-framing="true"
>
	<h2
		id="case-workflow-p127-operational-title"
		class="{DS_TYPE_CLASSES.section} m-0 text-sm font-medium text-[color:var(--ce-l-text-primary)]"
	>
		{P127_WORKFLOW_SURFACE_TITLE}
	</h2>
	<p
		class="{DS_BANNER_CLASSES.body} m-0 mt-1.5 text-xs leading-snug text-[color:var(--ce-l-text-muted)]"
	>
		{P127_WORKFLOW_FRAMING_BODY_PRIMARY}
	</p>
	<p
		class="{DS_BANNER_CLASSES.body} m-0 mt-1.5 text-xs leading-snug text-[color:var(--ce-l-text-muted)]"
	>
		{P127_WORKFLOW_FRAMING_BODY_SECONDARY}
	</p>
	<p
		class="{DS_BANNER_CLASSES.body} m-0 mt-1.5 text-xs leading-snug text-[color:var(--ce-l-text-muted)]"
	>
		{P127_WORKFLOW_FRAMING_BODY_TERTIARY}
	</p>
</section>
