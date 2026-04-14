<!--
	P124-01 — Presentational authority framing for the Timeline surface only.
	No stores, no data, no conditional authority.
-->
<script lang="ts">
	import {
		DS_BANNER_CLASSES,
		DS_STATUS_SURFACE_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import {
		P124_TIMELINE_AUTHORITY_BODY,
		P124_TIMELINE_SURFACE_TITLE
	} from '$lib/caseContext/p124TimelineAuthorityCopy';
</script>

<section
	class="{DS_BANNER_CLASSES.base} {DS_BANNER_CLASSES.denseModifier} {DS_STATUS_SURFACE_CLASSES.neutral} shrink-0 border-b border-[color:var(--ce-l-border-strong)] px-3 py-3 sm:px-4"
	aria-labelledby="case-timeline-p124-authority-title"
	data-testid="case-timeline-p124-authority-framing"
	data-p124-timeline-authority="true"
>
	<h2
		id="case-timeline-p124-authority-title"
		class="{DS_TYPE_CLASSES.section} m-0 text-sm font-semibold text-[color:var(--ce-l-text-primary)]"
	>
		{P124_TIMELINE_SURFACE_TITLE}
	</h2>
	<p
		class="{DS_BANNER_CLASSES.body} m-0 mt-1.5 text-xs leading-snug text-[color:var(--ce-l-text-muted)]"
	>
		{P124_TIMELINE_AUTHORITY_BODY}
	</p>
</section>
