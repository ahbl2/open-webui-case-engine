<!--
	P126-01 / P126-05 — Non-authoritative Entities identity (structured references). Distinct from Timeline neutral, Notes info, Files success; uses warning-toned surface — not authority, draft, or evidence cues.
	P126-05 — Boundary discipline line (explicit links only; always visible on list + detail).
	No stores, no data, no conditional framing.
-->
<script lang="ts">
	import {
		DS_BANNER_CLASSES,
		DS_STATUS_SURFACE_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import {
		P126_ENTITIES_FRAMING_BODY_PRIMARY,
		P126_ENTITIES_FRAMING_BODY_SECONDARY,
		P126_ENTITIES_SURFACE_TITLE
	} from '$lib/caseContext/p126EntityFramingCopy';
	import { P126_ENTITIES_BOUNDARY_DISCIPLINE_LINE } from '$lib/caseContext/p126EntitiesBoundaryCopy';
</script>

<section
	class="{DS_BANNER_CLASSES.base} {DS_BANNER_CLASSES.denseModifier} {DS_STATUS_SURFACE_CLASSES.warning} shrink-0 border-b border-[color:var(--ce-l-border-strong)] px-3 py-3 sm:px-4"
	aria-labelledby="case-entities-p126-structured-title"
	data-testid="case-entities-p126-structured-framing"
	data-p126-entities-structured-framing="true"
>
	<h2
		id="case-entities-p126-structured-title"
		class="{DS_TYPE_CLASSES.section} m-0 text-sm font-semibold text-[color:var(--ce-l-text-primary)]"
	>
		{P126_ENTITIES_SURFACE_TITLE}
	</h2>
	<p
		class="{DS_BANNER_CLASSES.body} m-0 mt-1.5 text-xs leading-snug text-[color:var(--ce-l-text-muted)]"
	>
		{P126_ENTITIES_FRAMING_BODY_PRIMARY}
	</p>
	<p
		class="{DS_BANNER_CLASSES.body} m-0 mt-1.5 text-xs leading-snug text-[color:var(--ce-l-text-muted)]"
	>
		{P126_ENTITIES_FRAMING_BODY_SECONDARY}
	</p>
	<p
		id="case-entities-p126-boundary-discipline"
		class="{DS_BANNER_CLASSES.body} m-0 mt-1.5 text-xs leading-snug text-[color:var(--ce-l-text-muted)]"
		data-testid="case-entities-boundary-discipline"
	>
		{P126_ENTITIES_BOUNDARY_DISCIPLINE_LINE}
	</p>
</section>
