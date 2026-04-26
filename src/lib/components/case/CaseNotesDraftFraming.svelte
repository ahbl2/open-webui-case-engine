<!--
	P124-04 — Non-authoritative Notes identity (draft workspace). Chrome hero band aligned with Timeline route + Activity shell (tier L).
-->
<script lang="ts">
	import { P124_NOTES_DRAFT_BODY, P124_NOTES_SURFACE_TITLE } from '$lib/caseContext/p124NotesDraftCopy';
	import { BookOpenIcon } from 'heroicons-svelte/24/outline';
</script>

<section
	class="ce-l-notes-hero shrink-0"
	aria-labelledby="case-notes-p124-draft-title"
	data-testid="case-notes-p124-draft-framing"
	data-p124-notes-draft-framing="true"
>
	<div class="flex min-w-0 flex-1 flex-col gap-1">
		<div class="sr-only ce-l-notes-hero-title">Notes surface</div>
		<h2
			id="case-notes-p124-draft-title"
			class="m-0 flex items-center gap-2 text-lg font-semibold tracking-tight text-[color:var(--ce-l-text-primary)]"
		>
			<span class="ds-occ-kpi-card--cyan ds-case-overview-kpi-tile__icon" aria-hidden="true">
				<BookOpenIcon />
			</span>
			{P124_NOTES_SURFACE_TITLE}
		</h2>
		<p class="m-0 max-w-2xl text-xs leading-snug text-[color:var(--ce-l-text-muted)]">
			{P124_NOTES_DRAFT_BODY}
		</p>
	</div>
</section>
