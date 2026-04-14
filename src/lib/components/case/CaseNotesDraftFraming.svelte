<!--
	P124-04 — Non-authoritative Notes identity (draft workspace). Distinct from Timeline neutral framing (info surface).
-->
<script lang="ts">
	import {
		DS_BANNER_CLASSES,
		DS_STATUS_SURFACE_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import { P124_NOTES_DRAFT_BODY, P124_NOTES_SURFACE_TITLE } from '$lib/caseContext/p124NotesDraftCopy';
</script>

<section
	class="{DS_BANNER_CLASSES.base} {DS_BANNER_CLASSES.denseModifier} {DS_STATUS_SURFACE_CLASSES.info} shrink-0 border-b border-[color:var(--ce-l-border-strong)] px-3 py-3 sm:px-4"
	aria-labelledby="case-notes-p124-draft-title"
	data-testid="case-notes-p124-draft-framing"
	data-p124-notes-draft-framing="true"
>
	<h2
		id="case-notes-p124-draft-title"
		class="{DS_TYPE_CLASSES.section} m-0 text-sm font-semibold text-[color:var(--ce-l-text-primary)]"
	>
		{P124_NOTES_SURFACE_TITLE}
	</h2>
	<p
		class="{DS_BANNER_CLASSES.body} m-0 mt-1.5 text-xs leading-snug text-[color:var(--ce-l-text-muted)]"
	>
		{P124_NOTES_DRAFT_BODY}
	</p>
</section>
