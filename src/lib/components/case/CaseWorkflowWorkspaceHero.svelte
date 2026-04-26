<!--
	Workflow route hero — Tier L + Files/Proposals/Intelligence parity (elevated title bar; presentational only).
-->
<script lang="ts">
	import { ClipboardDocumentListIcon } from 'heroicons-svelte/24/outline';
	import { P127_WORKFLOW_FRAMING_BODY_PRIMARY, P127_WORKFLOW_SURFACE_TITLE } from '$lib/caseContext/p127WorkflowFramingCopy';

	/** Embedded Case Tools: tighter padding. */
	export let compact = false;
	/** e.g. workflow-page-header (tab) or case-workflow-p127-operational-framing (route framing). */
	export let sectionTestId = 'case-workflow-p127-operational-framing';
	/** When the parent sets `data-testid` (e.g. `CaseWorkflowTab` wrapper for scan contracts), omit the inner test id. */
	export let omitDataTestId = false;
</script>

<section
	class="shrink-0 border-b border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-elevated)] {compact
		? 'px-2 py-2'
		: 'px-3 py-3 sm:px-4'}"
	aria-labelledby="case-workflow-p127-operational-title"
	data-testid={omitDataTestId ? undefined : sectionTestId}
>
	<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
		<div class="min-w-0 flex-1">
			<div class="flex items-start gap-2">
				<ClipboardDocumentListIcon
					class="h-6 w-6 shrink-0 text-[color:var(--ce-l-text-muted)] sm:h-7 sm:w-7"
					aria-hidden="true"
				/>
				<div class="min-w-0">
					<h2
						id="case-workflow-p127-operational-title"
						class="m-0 text-lg font-semibold leading-snug tracking-tight text-[color:var(--ce-l-text-primary)] sm:text-xl"
					>
						{P127_WORKFLOW_SURFACE_TITLE}
					</h2>
					<p
						class="m-0 mt-1 max-w-3xl text-xs leading-snug text-[color:var(--ce-l-text-muted)] sm:text-sm"
					>
						{P127_WORKFLOW_FRAMING_BODY_PRIMARY}
					</p>
				</div>
			</div>
		</div>
		{#if $$slots.actions}
			<div class="flex flex-shrink-0 flex-wrap items-center justify-end gap-2 self-start sm:pt-0.5">
				<slot name="actions" />
			</div>
		{/if}
	</div>
</section>
