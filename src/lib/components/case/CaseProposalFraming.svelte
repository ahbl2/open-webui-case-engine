<!--
	P128-01 — Non-authoritative Proposals intake identity (candidate Timeline entries).
	Distinct from Timeline neutral, Notes info, Files success, Entities warning, Workflow raised —
	structural surface only (no ds-status-surface-*). Presentational: no stores, no data loading, no lifecycle hooks.
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
		P128_PROPOSALS_SURFACE_TITLE
	} from '$lib/caseContext/p128ProposalFramingCopy';
</script>

<section
	class="{DS_BANNER_CLASSES.base} {DS_BANNER_CLASSES.denseModifier} shrink-0 border-b border-[color:var(--ce-l-border-strong)] bg-[color:var(--ce-l-surface-raised)] px-3 py-3 sm:px-4"
	aria-labelledby="case-proposals-p128-intake-title"
	data-testid="case-proposals-p128-intake-framing"
	data-p128-proposals-intake-framing="true"
>
	<h2
		id="case-proposals-p128-intake-title"
		class="{DS_TYPE_CLASSES.section} m-0 text-sm font-medium text-[color:var(--ce-l-text-primary)]"
	>
		{P128_PROPOSALS_SURFACE_TITLE}
	</h2>
	<p
		class="{DS_BANNER_CLASSES.body} m-0 mt-1.5 text-xs leading-snug text-[color:var(--ce-l-text-muted)]"
	>
		{P128_PROPOSALS_FRAMING_BODY_PRIMARY}
	</p>
	<p
		class="{DS_BANNER_CLASSES.body} m-0 mt-1.5 text-xs leading-snug text-[color:var(--ce-l-text-muted)]"
	>
		{P128_PROPOSALS_FRAMING_BODY_SECONDARY}
	</p>
	<p
		class="{DS_BANNER_CLASSES.body} m-0 mt-1.5 text-xs leading-snug text-[color:var(--ce-l-text-muted)]"
	>
		{P128_PROPOSALS_FRAMING_BODY_TERTIARY}
	</p>
	<p
		class="{DS_BANNER_CLASSES.body} m-0 mt-1.5 text-xs leading-snug text-[color:var(--ce-l-text-muted)]"
	>
		{P128_PROPOSALS_FRAMING_BODY_ACCEPTANCE}
	</p>
	<p
		class="{DS_BANNER_CLASSES.body} m-0 mt-1.5 text-xs leading-snug text-[color:var(--ce-l-text-muted)]"
	>
		{P128_PROPOSALS_FRAMING_BODY_EMPTY_REINFORCE}
	</p>
</section>
