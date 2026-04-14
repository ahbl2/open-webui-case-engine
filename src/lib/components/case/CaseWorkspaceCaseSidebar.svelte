<script lang="ts">
	/**
	 * P123-02 — Case list + explicit selection + Phase 123 surface links (Timeline, Notes, Files).
	 * P123-03 / P123-04 — `getRouteCaseId` only (no store-derived case id for chrome).
	 * P123-05 — DS empty/loading copy; surface links only when route case id is valid (no `/case//…` links).
	 * P124-05 — Distinct `title` + boundary hint (Timeline vs Notes vs Files; not a unified feed).
	 * Server list via `listCasesSidebar` only.
	 * No auto-select on load; selection navigates explicitly to `/case/:id/timeline`.
	 */
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { caseEngineToken } from '$lib/stores';
	import { listCasesSidebar, type CaseEngineCase } from '$lib/apis/caseEngine';
	import { resolveActiveCaseSection } from '$lib/utils/caseNavSection';
	import { isDetectiveWave3CaseShellEnabled } from '$lib/case/detectiveWave3CaseShell';
	import ConnectCaseEngineModal from '$lib/components/layout/Sidebar/ConnectCaseEngineModal.svelte';
	import { DS_EMPTY_CLASSES, DS_LOADING_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import {
		P123_CASE_LIST_EMPTY,
		P123_CASE_LIST_LOADING,
		P123_SIDEBAR_SURFACE_LINKS_UNAVAILABLE
	} from '$lib/caseContext/p123CaseWorkspaceCopy';
	import {
		P124_NAV_TITLE_FILES,
		P124_NAV_TITLE_NOTES,
		P124_NAV_TITLE_TIMELINE,
		P124_SIDEBAR_SURFACE_BOUNDARY_HINT
	} from '$lib/caseContext/p124SurfaceSeparationCopy';
	import { getRouteCaseId } from '$lib/caseContext/routeCaseContext';

	let cases: CaseEngineCase[] = [];
	let casesLoading = false;
	let casesError = '';
	let searchQuery = '';
	let showConnectModal = false;

	$: routeCaseId = getRouteCaseId($page.params) ?? '';
	$: activeSection = resolveActiveCaseSection($page.url.pathname);
	$: wave3CaseShellEnabled = isDetectiveWave3CaseShellEnabled();

	$: filteredCases = cases.filter((c) => {
		if (!searchQuery.trim()) return true;
		const q = searchQuery.toLowerCase();
		return (
			(c.case_number ?? '').toLowerCase().includes(q) ||
			(c.title ?? '').toLowerCase().includes(q)
		);
	});

	async function loadCases() {
		const token = $caseEngineToken;
		if (!token) {
			cases = [];
			return;
		}
		casesLoading = true;
		casesError = '';
		try {
			cases = await listCasesSidebar(token);
		} catch (e: unknown) {
			casesError = e instanceof Error ? e.message : 'Failed to load cases';
			cases = [];
		} finally {
			casesLoading = false;
		}
	}

	$: if ($caseEngineToken) {
		loadCases();
	}

	$: if (!$caseEngineToken) {
		cases = [];
	}

	function selectCase(c: CaseEngineCase) {
		const id = String(c.id ?? '');
		if (!id) return;
		const target = `/case/${id}/timeline`;
		if ($page.url.pathname === target) return;
		goto(target);
	}

	/** P123-02 — explicit route mappings only (no inferred feature availability). */
	const p123SurfaceLinks = [
		{
			id: 'timeline' as const,
			label: 'Timeline',
			path: 'timeline' as const,
			navTitle: P124_NAV_TITLE_TIMELINE
		},
		{
			id: 'notes' as const,
			label: 'Notes',
			path: 'notes' as const,
			navTitle: P124_NAV_TITLE_NOTES
		},
		{
			id: 'files' as const,
			label: 'Files',
			path: 'files' as const,
			navTitle: P124_NAV_TITLE_FILES
		}
	];

	function surfaceHref(caseId: string, section: 'timeline' | 'notes' | 'files'): string {
		return `/case/${caseId}/${section}`;
	}
</script>

<div
	class="flex h-full min-h-0 w-[15rem] max-w-[18rem] shrink-0 flex-col gap-2 overflow-hidden p-2"
	data-testid="case-workspace-case-sidebar"
	data-region="case-workspace-case-sidebar"
>
	{#if !$caseEngineToken}
		<button
			type="button"
			class="rounded-lg border border-gray-300 px-3 py-2 text-sm transition hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
			data-testid="case-workspace-sidebar-connect"
			on:click={() => (showConnectModal = true)}
		>
			Connect to Case Engine
		</button>
		<div
			class="{DS_EMPTY_CLASSES.root} {DS_EMPTY_CLASSES.compact} border-0 bg-transparent p-0"
			data-testid="case-workspace-sidebar-no-token-copy"
		>
			<p class="{DS_EMPTY_CLASSES.description} text-xs text-[color:var(--ce-l-text-muted)]">
				Connect to load the case list. No case is selected until you open a case from the list.
			</p>
		</div>
	{:else}
		<div class="flex min-h-0 flex-1 flex-col gap-2" data-testid="case-workspace-case-list">
			<input
				type="text"
				placeholder="Search cases…"
				bind:value={searchQuery}
				class="w-full rounded border border-gray-200 bg-transparent px-2 py-1.5 text-xs placeholder-gray-500 dark:border-gray-700"
				data-testid="case-workspace-case-search"
				autocomplete="off"
			/>
			{#if casesError}
				<div
					class="text-xs text-red-600 dark:text-red-400"
					data-testid="case-workspace-case-list-error"
					role="alert"
				>
					{casesError}
				</div>
			{/if}
			{#if casesLoading}
				<div
					class="{DS_LOADING_CLASSES.compact} text-xs text-[color:var(--ce-l-text-muted)]"
					data-testid="case-workspace-case-list-loading"
				>
					{P123_CASE_LIST_LOADING}
				</div>
			{:else if filteredCases.length === 0}
				<div
					class="{DS_EMPTY_CLASSES.root} {DS_EMPTY_CLASSES.compact} py-2"
					data-testid="case-workspace-case-list-empty"
				>
					<p class="{DS_EMPTY_CLASSES.title} text-xs text-[color:var(--ce-l-text-muted)]">
						{P123_CASE_LIST_EMPTY}
					</p>
				</div>
			{:else}
				<div
					class="scrollbar-hidden flex max-h-48 min-h-0 flex-col space-y-0.5 overflow-y-auto"
					data-testid="case-workspace-case-list-rows"
				>
					{#each filteredCases as c (c.id)}
						<div
							class="flex items-center gap-1 rounded px-2 py-1.5 text-xs {c.id === routeCaseId
								? 'bg-gray-100 dark:bg-gray-800'
								: ''}"
							data-testid="case-workspace-case-row"
							data-case-row-id={c.id}
							data-case-row-active={c.id === routeCaseId ? 'true' : 'false'}
						>
							<button
								type="button"
								class="min-w-0 flex-1 rounded text-left transition hover:bg-gray-100 dark:hover:bg-gray-800"
								title="Open case {c.case_number ?? c.id}"
								on:click={() => selectCase(c)}
							>
								<span class="font-medium tabular-nums">{c.case_number ?? c.id}</span>
								<span class="block truncate text-gray-600 dark:text-gray-400">{c.title ?? ''}</span>
								{#if c.unit}
									<span class="block truncate text-[10px] text-gray-500 dark:text-gray-500">{c.unit}</span>
								{/if}
							</button>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	{#if routeCaseId}
		<nav
			class="ce-l-case-nav-rail flex shrink-0 flex-col gap-1 border-t border-[color:var(--ce-l-chrome-border)] pt-2"
			data-testid="case-workspace-nav"
			aria-label="Case workspace sections"
			aria-describedby="case-workspace-p124-boundary-hint"
			data-region={wave3CaseShellEnabled ? 'case-shell-tabs' : undefined}
			data-p123-nav-disabled="false"
		>
			{#each p123SurfaceLinks as item}
				<a
					href={surfaceHref(routeCaseId, item.path)}
					class="ce-l-tab-link ce-l-case-nav-link {activeSection === item.id
						? 'ce-l-tab-link--active'
						: ''}"
					data-case-tab={item.id}
					title={item.navTitle}
					aria-current={activeSection === item.id ? 'page' : undefined}
				>
					{item.label}
				</a>
			{/each}
			<p
				id="case-workspace-p124-boundary-hint"
				class="mt-1 px-0.5 text-[9px] leading-snug text-[color:var(--ce-l-text-muted)]"
				data-testid="case-workspace-p124-boundary-hint"
			>
				{P124_SIDEBAR_SURFACE_BOUNDARY_HINT}
			</p>
		</nav>
	{:else}
		<div
			class="{DS_EMPTY_CLASSES.root} {DS_EMPTY_CLASSES.compact} border-t border-[color:var(--ce-l-chrome-border)] pt-2"
			data-testid="case-workspace-sidebar-no-route-case"
			data-p123-nav-disabled="true"
		>
			<p class="{DS_EMPTY_CLASSES.description} text-xs text-[color:var(--ce-l-text-muted)]">
				{P123_SIDEBAR_SURFACE_LINKS_UNAVAILABLE}
			</p>
		</div>
	{/if}
</div>

<ConnectCaseEngineModal
	show={showConnectModal}
	on:close={() => (showConnectModal = false)}
	on:connected={async () => {
		showConnectModal = false;
		await loadCases();
	}}
/>
