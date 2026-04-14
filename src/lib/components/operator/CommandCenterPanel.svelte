<!--
	P131-01 — Operator Command Center: identity + framing + read-only placeholders only.
	No data fetching, no Case Engine, no navigation handlers.
-->
<script lang="ts">
	import {
		DS_BANNER_CLASSES,
		DS_PANEL_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import {
		P131_COMMAND_CENTER_BOUNDARY_NO_ACTIONS,
		P131_COMMAND_CENTER_BOUNDARY_NOT_TRUTH,
		P131_COMMAND_CENTER_BOUNDARY_TIMELINE,
		P131_COMMAND_CENTER_CORE_PRINCIPLE,
		P131_COMMAND_CENTER_INTRO_CROSS_CASE,
		P131_COMMAND_CENTER_INTRO_NO_MUTATION,
		P131_COMMAND_CENTER_INTRO_READ_ONLY,
		P131_COMMAND_CENTER_NAV_INTENT_PLACEHOLDER,
		P131_COMMAND_CENTER_PLACEHOLDER_ROW_LABEL,
		P131_COMMAND_CENTER_SECTION_ACTIVITY_DESC,
		P131_COMMAND_CENTER_SECTION_ACTIVITY_NOTE,
		P131_COMMAND_CENTER_SECTION_ACTIVITY_TITLE,
		P131_COMMAND_CENTER_SECTION_CASE_LIST_DESC,
		P131_COMMAND_CENTER_SECTION_CASE_LIST_NOTE,
		P131_COMMAND_CENTER_SECTION_CASE_LIST_TITLE,
		P131_COMMAND_CENTER_SECTION_WORKFLOW_DESC,
		P131_COMMAND_CENTER_SECTION_WORKFLOW_NOTE,
		P131_COMMAND_CENTER_SECTION_WORKFLOW_TITLE,
		P131_COMMAND_CENTER_SURFACE_TITLE
	} from '$lib/case/p131CommandCenterCopy';
</script>

<div
	class="ce-l-command-center flex min-h-0 flex-1 flex-col overflow-hidden border-l-4 border-slate-500/50 bg-[color:var(--ce-l-surface-raised)]"
	data-testid="command-center-panel"
	data-p131-command-center="true"
>
	<section
		class="{DS_BANNER_CLASSES.base} {DS_BANNER_CLASSES.denseModifier} shrink-0 border-b border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-muted)] px-3 py-3 sm:px-4"
		aria-labelledby="command-center-p131-title"
		data-testid="command-center-framing"
	>
		<h1
			id="command-center-p131-title"
			class="{DS_TYPE_CLASSES.section} m-0 text-sm font-semibold text-[color:var(--ce-l-text-primary)]"
		>
			{P131_COMMAND_CENTER_SURFACE_TITLE}
		</h1>
		<p class="{DS_BANNER_CLASSES.body} m-0 mt-2 text-xs leading-snug text-[color:var(--ce-l-text-muted)]">
			{P131_COMMAND_CENTER_INTRO_CROSS_CASE}
		</p>
		<p class="{DS_BANNER_CLASSES.body} m-0 mt-2 text-xs leading-snug text-[color:var(--ce-l-text-muted)]">
			{P131_COMMAND_CENTER_INTRO_READ_ONLY}
		</p>
		<p class="{DS_BANNER_CLASSES.body} m-0 mt-2 text-xs leading-snug text-[color:var(--ce-l-text-muted)]">
			{P131_COMMAND_CENTER_INTRO_NO_MUTATION}
		</p>
		<p
			class="{DS_TYPE_CLASSES.body} m-0 mt-3 border-t border-[color:var(--ce-l-border-default)] pt-3 text-xs font-medium text-[color:var(--ce-l-text-primary)]"
		>
			{P131_COMMAND_CENTER_CORE_PRINCIPLE}
		</p>
		<p class="{DS_BANNER_CLASSES.body} m-0 mt-2 text-xs leading-snug text-[color:var(--ce-l-text-muted)]">
			{P131_COMMAND_CENTER_BOUNDARY_TIMELINE}
		</p>
		<p class="{DS_BANNER_CLASSES.body} m-0 mt-2 text-xs leading-snug text-[color:var(--ce-l-text-muted)]">
			{P131_COMMAND_CENTER_BOUNDARY_NOT_TRUTH}
		</p>
		<p class="{DS_BANNER_CLASSES.body} m-0 mt-2 text-xs leading-snug text-[color:var(--ce-l-text-muted)]">
			{P131_COMMAND_CENTER_BOUNDARY_NO_ACTIONS}
		</p>
	</section>

	<div
		class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3 pb-4 sm:px-4"
		data-testid="command-center-primary-scroll"
		data-region="command-center-primary-scroll"
	>
		<section
			class="{DS_PANEL_CLASSES.muted} border border-[color:var(--ce-l-border-default)] p-3"
			aria-labelledby="command-center-placeholder-case-list"
			data-testid="command-center-placeholder-case-list"
		>
			<h2
				id="command-center-placeholder-case-list"
				class="{DS_TYPE_CLASSES.label} m-0 text-[color:var(--ce-l-text-secondary)]"
			>
				{P131_COMMAND_CENTER_SECTION_CASE_LIST_TITLE}
			</h2>
			<p class="{DS_TYPE_CLASSES.body} m-0 mt-1 text-sm text-[color:var(--ce-l-text-primary)]">
				{P131_COMMAND_CENTER_SECTION_CASE_LIST_DESC}
			</p>
			<p class="{DS_TYPE_CLASSES.meta} m-0 mt-1 text-[color:var(--ce-l-text-muted)]">
				{P131_COMMAND_CENTER_SECTION_CASE_LIST_NOTE}
			</p>
			<div
				class="mt-3 rounded border border-dashed border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-raised)] px-2 py-2 text-xs text-[color:var(--ce-l-text-muted)]"
				data-testid="command-center-placeholder-case-list-row"
			>
				{P131_COMMAND_CENTER_PLACEHOLDER_ROW_LABEL}
			</div>
			<p class="{DS_TYPE_CLASSES.meta} m-0 mt-2 text-[color:var(--ce-l-text-muted)]">
				{P131_COMMAND_CENTER_NAV_INTENT_PLACEHOLDER}
			</p>
		</section>

		<section
			class="{DS_PANEL_CLASSES.muted} border border-[color:var(--ce-l-border-default)] p-3"
			aria-labelledby="command-center-placeholder-activity"
			data-testid="command-center-placeholder-activity"
		>
			<h2
				id="command-center-placeholder-activity"
				class="{DS_TYPE_CLASSES.label} m-0 text-[color:var(--ce-l-text-secondary)]"
			>
				{P131_COMMAND_CENTER_SECTION_ACTIVITY_TITLE}
			</h2>
			<p class="{DS_TYPE_CLASSES.body} m-0 mt-1 text-sm text-[color:var(--ce-l-text-primary)]">
				{P131_COMMAND_CENTER_SECTION_ACTIVITY_DESC}
			</p>
			<p class="{DS_TYPE_CLASSES.meta} m-0 mt-1 text-[color:var(--ce-l-text-muted)]">
				{P131_COMMAND_CENTER_SECTION_ACTIVITY_NOTE}
			</p>
			<div
				class="mt-3 rounded border border-dashed border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-raised)] px-2 py-2 text-xs text-[color:var(--ce-l-text-muted)]"
				data-testid="command-center-placeholder-activity-row"
			>
				{P131_COMMAND_CENTER_PLACEHOLDER_ROW_LABEL}
			</div>
			<p class="{DS_TYPE_CLASSES.meta} m-0 mt-2 text-[color:var(--ce-l-text-muted)]">
				{P131_COMMAND_CENTER_NAV_INTENT_PLACEHOLDER}
			</p>
		</section>

		<section
			class="{DS_PANEL_CLASSES.muted} border border-[color:var(--ce-l-border-default)] p-3"
			aria-labelledby="command-center-placeholder-workflow"
			data-testid="command-center-placeholder-workflow"
		>
			<h2
				id="command-center-placeholder-workflow"
				class="{DS_TYPE_CLASSES.label} m-0 text-[color:var(--ce-l-text-secondary)]"
			>
				{P131_COMMAND_CENTER_SECTION_WORKFLOW_TITLE}
			</h2>
			<p class="{DS_TYPE_CLASSES.body} m-0 mt-1 text-sm text-[color:var(--ce-l-text-primary)]">
				{P131_COMMAND_CENTER_SECTION_WORKFLOW_DESC}
			</p>
			<p class="{DS_TYPE_CLASSES.meta} m-0 mt-1 text-[color:var(--ce-l-text-muted)]">
				{P131_COMMAND_CENTER_SECTION_WORKFLOW_NOTE}
			</p>
			<div
				class="mt-3 rounded border border-dashed border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-raised)] px-2 py-2 text-xs text-[color:var(--ce-l-text-muted)]"
				data-testid="command-center-placeholder-workflow-row"
			>
				{P131_COMMAND_CENTER_PLACEHOLDER_ROW_LABEL}
			</div>
			<p class="{DS_TYPE_CLASSES.meta} m-0 mt-2 text-[color:var(--ce-l-text-muted)]">
				{P131_COMMAND_CENTER_NAV_INTENT_PLACEHOLDER}
			</p>
		</section>
	</div>
</div>
