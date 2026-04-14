<!--
	P125-01 — Non-authoritative Files identity (supporting evidence). Distinct from Timeline neutral (authority) and Notes info (drafts); uses success-toned surface — not severity styling.
	No stores, no data, no conditional framing.
-->
<script lang="ts">
	import {
		DS_BANNER_CLASSES,
		DS_STATUS_SURFACE_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import { P125_FILES_EVIDENCE_BODY, P125_FILES_SURFACE_TITLE } from '$lib/caseContext/p125FilesEvidenceCopy';
</script>

<section
	class="{DS_BANNER_CLASSES.base} {DS_BANNER_CLASSES.denseModifier} {DS_STATUS_SURFACE_CLASSES.success} shrink-0 border-b border-[color:var(--ce-l-border-strong)] px-3 py-3 sm:px-4"
	aria-labelledby="case-files-p125-evidence-title"
	data-testid="case-files-p125-evidence-framing"
	data-p125-files-evidence="true"
>
	<h2
		id="case-files-p125-evidence-title"
		class="{DS_TYPE_CLASSES.section} m-0 text-sm font-semibold text-[color:var(--ce-l-text-primary)]"
	>
		{P125_FILES_SURFACE_TITLE}
	</h2>
	<p
		class="{DS_BANNER_CLASSES.body} m-0 mt-1.5 text-xs leading-snug text-[color:var(--ce-l-text-muted)]"
	>
		{P125_FILES_EVIDENCE_BODY}
	</p>
</section>
