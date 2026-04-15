<!--
	P123-01 — Presentational case workspace frame: header strip (props-only identity) + sidebar slot + main slot.
	No data fetching, stores, routing, or case identity inference — parent sets `hasActiveCase` explicitly.
-->
<script lang="ts">
	import {
		DS_CASE_SHELL_CLASSES,
		DS_EMPTY_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import { P123_LAYOUT_HEADER_NO_CASE } from '$lib/caseContext/p123CaseWorkspaceCopy';

	/** When true, header shows `caseNumber` / `caseTitle` / `caseUnit` as passed (may be empty strings). When false, explicit empty state. */
	export let hasActiveCase = false;

	export let caseNumber: string | undefined = undefined;
	export let caseTitle: string | undefined = undefined;
	export let caseUnit: string | undefined = undefined;

	/** When false, only the sidebar + main split is rendered (parent supplies the workspace header, e.g. `CaseWorkspaceHeader`). */
	export let showHeader = true;
</script>

<div
	class="{DS_CASE_SHELL_CLASSES.root} flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden"
	data-testid="case-workspace-layout-root"
	data-region="case-workspace-layout"
>
	{#if showHeader}
	<div class="shrink-0 z-10 min-w-0" data-region="case-workspace-layout-header-wrap">
		<header
			class="border-b border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-chrome)] px-3 py-2.5 sm:min-h-12 sm:py-2"
			data-testid="case-workspace-layout-header"
			data-region="case-workspace-layout-header"
		>
			{#if hasActiveCase}
				<div
					class="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1"
					data-testid="case-workspace-layout-identity"
					data-region="case-workspace-layout-identity"
				>
					<span
						class="{DS_TYPE_CLASSES.mono} shrink-0 select-all text-xs tabular-nums text-[color:var(--ce-l-text-muted)]"
						data-testid="case-workspace-layout-case-number"
					>
						{caseNumber ?? ''}
					</span>
					<h1
						class="{DS_TYPE_CLASSES.body} min-w-0 max-w-full flex-1 basis-[min(100%,14rem)] truncate font-semibold leading-snug text-[color:var(--ce-l-text-primary)] sm:max-w-xl md:max-w-2xl text-sm sm:text-base"
						data-testid="case-workspace-layout-case-title"
					>
						{caseTitle ?? ''}
					</h1>
					<span
						class="{DS_TYPE_CLASSES.meta} shrink-0 text-[color:var(--ce-l-text-muted)]"
						data-testid="case-workspace-layout-case-unit"
					>
						{caseUnit ?? ''}
					</span>
				</div>
			{:else}
				<div
					class="{DS_EMPTY_CLASSES.root} {DS_EMPTY_CLASSES.compact} border-0 bg-transparent p-0"
					data-testid="case-workspace-layout-empty"
					data-region="case-workspace-layout-empty"
				>
					<p class="{DS_EMPTY_CLASSES.title} text-sm text-[color:var(--ce-l-text-muted)]">
						{P123_LAYOUT_HEADER_NO_CASE}
					</p>
				</div>
			{/if}
		</header>
	</div>
	{/if}

	<div
		class="flex flex-1 min-h-0 min-w-0 overflow-hidden"
		data-region="case-workspace-layout-main-split"
	>
		<div
			class="shrink-0 min-h-0 overflow-hidden border-r border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-chrome)]"
			data-testid="case-workspace-layout-sidebar"
			data-region="case-workspace-layout-sidebar"
		>
			<slot name="sidebar" />
		</div>
		<div
			class="flex flex-1 min-h-0 min-w-0 flex-col overflow-hidden"
			data-testid="case-workspace-layout-main"
			data-region="case-workspace-layout-main"
		>
			<slot />
		</div>
	</div>
</div>
