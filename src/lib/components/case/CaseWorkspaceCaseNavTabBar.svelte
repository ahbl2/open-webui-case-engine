<!--
	Primary case workspace route tabs (Overview, Timeline, …) — matches dashboard mock horizontal nav.
-->
<script lang="ts">
	import { page } from '$app/state';
	import { resolveActiveCaseSection, type CaseNavSection } from '$lib/utils/caseNavSection';

	interface Props {
		caseId: string;
		/** Sit inside unified OCC sheet in case layout — separator only, no full chrome strip. */
		occSheetEmbedded?: boolean;
	}

	let { caseId, occSheetEmbedded = false }: Props = $props();

	const cid = $derived(encodeURIComponent(caseId));
	/** Svelte 5: `page` from `$app/state` — `$app/stores` `page` does not update after client navigation. */
	const active = $derived(resolveActiveCaseSection(page.url.pathname));

	const tabs: { segment: CaseNavSection; label: string }[] = [
		{ segment: 'summary', label: 'Overview' },
		{ segment: 'timeline', label: 'Timeline' },
		{ segment: 'notes', label: 'Notes' },
		{ segment: 'files', label: 'Files' },
		{ segment: 'intelligence', label: 'Intelligence' },
		{ segment: 'workflow', label: 'Workflow' },
		{ segment: 'activity', label: 'Activity' },
		{ segment: 'ai-workspace', label: 'AI Assistant' }
	];

	function isActive(segment: CaseNavSection): boolean {
		return active === segment;
	}
</script>

<nav
	class="flex shrink-0 flex-col px-1 {occSheetEmbedded
		? 'border-t border-[color:var(--ce-l-chrome-border)]/80 bg-transparent'
		: 'border-b border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-chrome)]'}"
	data-testid="case-workspace-case-nav-tabs"
	aria-label="Case workspace sections"
	data-case-tabs-occ-embedded={occSheetEmbedded ? 'true' : undefined}
>
	<div
		class="case-workspace-case-nav__strip flex min-h-[2.75rem] w-full min-w-0 items-stretch gap-0 overflow-x-auto overflow-y-hidden divide-x divide-[color:color-mix(in_oklab,var(--ce-l-chrome-border)_38%,transparent)] sm:px-2"
	>
		{#each tabs as t (t.segment)}
			<a
				href="/case/{cid}/{t.segment}"
				class="case-workspace-case-nav__link"
				data-case-shell-tab={t.segment}
				data-active={isActive(t.segment) ? 'true' : 'false'}
				aria-current={isActive(t.segment) ? 'page' : undefined}
			>
				{t.label}
			</a>
		{/each}
	</div>
</nav>

<style>
	:global([data-testid='case-workspace-case-nav-tabs'] .case-workspace-case-nav__strip) {
		-webkit-overflow-scrolling: touch;
		scrollbar-width: thin;
		scrollbar-color: var(--ce-l-border-strong) transparent;
	}

	:global([data-testid='case-workspace-case-nav-tabs'] .case-workspace-case-nav__strip::-webkit-scrollbar) {
		height: 6px;
	}

	:global([data-testid='case-workspace-case-nav-tabs'] .case-workspace-case-nav__strip::-webkit-scrollbar-thumb) {
		background-color: var(--ce-l-border-strong);
		border-radius: 3px;
	}

	:global([data-testid='case-workspace-case-nav-tabs'] .case-workspace-case-nav__link) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		white-space: nowrap;
		min-height: 2.75rem;
		padding: 0.5rem 0.75rem;
		font-size: 0.7rem;
		font-weight: 600;
		line-height: 1.25rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		text-decoration: none;
		margin-bottom: -1px;
		color: var(--ce-l-text-muted);
		border: 1px solid transparent;
		border-bottom-width: 2px;
		border-bottom-color: transparent;
		background-color: transparent;
		transition:
			color 0.15s ease,
			border-color 0.15s ease,
			background-color 0.15s ease;
	}

	@media (min-width: 640px) {
		:global([data-testid='case-workspace-case-nav-tabs'] .case-workspace-case-nav__link) {
			padding-left: 1rem;
			padding-right: 1rem;
		}
	}

	:global([data-testid='case-workspace-case-nav-tabs'] .case-workspace-case-nav__link:hover) {
		color: var(--ce-l-text-secondary);
		background-color: color-mix(in oklab, var(--ce-l-surface-muted) 55%, transparent);
	}

	:global([data-testid='case-workspace-case-nav-tabs'] .case-workspace-case-nav__link:focus-visible) {
		outline: 2px solid var(--ce-l-tab-active-border);
		outline-offset: -2px;
		z-index: 2;
	}

	:global([data-testid='case-workspace-case-nav-tabs'] .case-workspace-case-nav__link[data-active='true']) {
		position: relative;
		z-index: 1;
		color: var(--ce-l-tab-active-fg);
		font-weight: 600;
		border-radius: 0.375rem 0.375rem 0 0;
		border-color: color-mix(in oklab, var(--ce-l-tab-active-border) 58%, transparent);
		border-bottom-width: 3px;
		border-bottom-color: var(--ce-l-tab-active-border);
		background-color: color-mix(in oklab, var(--ce-l-tab-active-border) 14%, var(--ce-l-chrome));
	}

	:global([data-testid='case-workspace-case-nav-tabs'] .case-workspace-case-nav__link[data-active='true']:hover) {
		color: var(--ce-l-tab-active-fg);
		background-color: color-mix(in oklab, var(--ce-l-tab-active-border) 18%, var(--ce-l-chrome));
	}

	@media (prefers-reduced-motion: reduce) {
		:global([data-testid='case-workspace-case-nav-tabs'] .case-workspace-case-nav__link) {
			transition: none;
		}
	}
</style>
