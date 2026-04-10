<script lang="ts">
	/**
	 * P19-06 — Case Workspace Shell
	 * P71-03 — Identity bar uses Tier L tokens / P70-04.
	 * P71-04 — Primary tab strip uses Tier L tokens / P70-05 (horizontal scroll, ce-l-tab-*).
	 *
	 * This layout establishes the case-native workspace for all /case/[id]/* routes.
	 *   - Loading and exposing case metadata to child routes
	 *   - Top case header, content-level tab nav (Chat, Timeline, Files, Notes, Summary, Workflow, Warrants, Intelligence, Activity, Graph),
	 *     main workspace slot, right context rail, bottom composer region
	 *   - Enforcing P19-05 access gating before any case content renders
	 */
	import { onMount, onDestroy, tick } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	import {
		caseEngineToken,
		caseModeActive,
		activeCaseMeta,
		activeCaseId,
		activeCaseNumber,
		caseEngineAuthState
	} from '$lib/stores';
	import { getCaseById } from '$lib/apis/caseEngine';
	import type { CaseEngineCase } from '$lib/apis/caseEngine';
	import {
		classifyCaseEngineFailure,
		formatCaseEngineUiMessage,
		caseShellHeaderDataUiState,
		type CaseEngineUiState
	} from '$lib/utils/caseEngineUiState';
	import { resolveAuthStateDecision, blockedRedirectPath } from '$lib/utils/authStateDecision';
	import { resolveActiveCaseSection } from '$lib/utils/caseNavSection';
	import {
		runCaseWorkspaceScrollDiagnostics,
		shouldRunCaseWorkspaceScrollDiagnostics
	} from '$lib/utils/caseWorkspaceScrollDiagnostics';
	import EditCaseModal from '$lib/components/case/EditCaseModal.svelte';
	import ChevronLeft from '$lib/components/icons/ChevronLeft.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';

	// Suppress the global Open WebUI sidebar immediately — synchronous, before
	// the first render, so there is no frame where both shells are visible.
	caseModeActive.set(true);

	let loading = true;
	let loadError = '';
	let showEditCaseModal = false;
	let editCaseSeed: CaseEngineCase | null = null;
	/** P20-PRE-04: classified failure for case shell load (never silent / never fake success). */
	let loadUiState: CaseEngineUiState | null = null;

	/** Primary tab strip scroll container — P70-05 §2.4 scroll active into view */
	let caseTabNavEl: HTMLElement | null = null;

	function prefersReducedMotion(): boolean {
		if (!browser) return true;
		return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	function scrollActiveCaseTabIntoView(): void {
		if (!browser || !caseTabNavEl || !activeSection) return;
		const el = caseTabNavEl.querySelector(`[data-case-tab="${activeSection}"]`);
		if (!(el instanceof HTMLElement)) return;
		el.scrollIntoView({
			block: 'nearest',
			inline: 'center',
			behavior: prefersReducedMotion() ? 'auto' : 'smooth'
		});
	}

	// Prevent double-loading on the reactive block below by seeding prevCaseId
	// with the current route param before the reactive statement first evaluates.
	let prevCaseId: string = $page.params.id ?? '';

	async function loadCaseMeta(caseId: string): Promise<void> {
		loading = true;
		loadError = '';
		loadUiState = 'loading';
		activeCaseMeta.set(null);
		try {
			const c = await getCaseById(caseId, $caseEngineToken!);
			activeCaseMeta.set({
				id: c.id as string,
				case_number: (c.case_number ?? c.id) as string,
				title: (c.title ?? '') as string,
				unit: (c.unit ?? '') as string,
				status: (c.status ?? '') as string,
				incident_date:
					typeof c.incident_date === 'string' && c.incident_date.trim()
						? c.incident_date
						: null
			});
			activeCaseId.set(c.id as string);
			activeCaseNumber.set((c.case_number ?? null) as string | null);
			loadUiState = 'success';
		} catch (e: unknown) {
			const { state, userMessage } = classifyCaseEngineFailure(e);
			loadUiState = state;
			loadError = formatCaseEngineUiMessage(state, userMessage);
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		// P19-05 gating: case workspace requires an active authorization state.
		// caseModeActive is already true from the synchronous script-level set above.
		// We reset it explicitly here before any blocked redirect so it is never left
		// stale if navigation away happens before onDestroy can fire.
		if ($caseEngineAuthState) {
			const decision = resolveAuthStateDecision($caseEngineAuthState.state);
			const redirectTo = blockedRedirectPath(decision);
			if (redirectTo) {
				caseModeActive.set(false); // explicit cleanup — do not rely solely on onDestroy
				await goto(redirectTo);
				return;
			}
		}

		if (!$caseEngineToken) {
			caseModeActive.set(false); // explicit cleanup before leaving to /cases
			await goto('/cases');
			return;
		}

		await loadCaseMeta($page.params.id);
	});

	onDestroy(() => {
		// Restore global shell when leaving the case workspace.
		caseModeActive.set(false);
		activeCaseMeta.set(null);
	});

	/** P71-FU4 / P71-FU5 — non-production: subscribe always so `?caseScrollDiag=1` + sessionStorage work after tab clicks */
	onMount(() => {
		if (!browser || import.meta.env.PROD) return;
		const schedule = () => {
			if (!shouldRunCaseWorkspaceScrollDiagnostics()) return;
			void tick().then(() => {
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						setTimeout(() => runCaseWorkspaceScrollDiagnostics(), 0);
					});
				});
			});
		};
		schedule();
		const unsub = page.subscribe(() => schedule());
		return () => unsub();
	});

	// Reload case metadata when switching between cases while the layout persists.
	$: if ($page.params.id && $caseEngineToken && $page.params.id !== prevCaseId) {
		prevCaseId = $page.params.id;
		loadCaseMeta($page.params.id);
	}

	// Blueprint case-workspace navigation sections.
	// `implemented: true`  → a real route exists; renders as a clickable link.
	// `implemented: false` → no route yet; renders as a disabled non-interactive
	//                         element so users are never silently sent to the
	//                         wrong section.
	// P19-08: Chat migrated.
	// P19-14: Files, Notes, Activity migrated to dedicated routes.
	// P19-20: Timeline migrated — backed by official timeline_entries.
	// P38-02: Proposals in primary tab strip (governed review queue; same route as /case/[id]/proposals).
	const caseNavItems: Array<{ id: string; label: string; implemented: boolean }> = [
		{ id: 'chat',      label: 'Chat',      implemented: true  },
		{ id: 'timeline',  label: 'Timeline',  implemented: true  },
		{ id: 'files',     label: 'Files',     implemented: true  },
		{ id: 'notes',     label: 'Notes',     implemented: true  },
		{ id: 'proposals', label: 'Proposals', implemented: true  },
		{ id: 'summary',   label: 'Summary',   implemented: true  },
		{ id: 'workflow',  label: 'Workflow',  implemented: true  },
		{ id: 'warrants',  label: 'Warrants',  implemented: true  },
		{ id: 'intelligence', label: 'Intelligence', implemented: true },
		{ id: 'activity',  label: 'Activity',  implemented: true  },
		{ id: 'graph',     label: 'Graph',     implemented: true  }
	];

	$: activeSection = resolveActiveCaseSection($page.url.pathname);

	// P70-05 §2.4 — active tab stays visible in horizontally scrolling strip
	$: if (browser && activeSection) {
		tick().then(() => scrollActiveCaseTabIntoView());
	}

	$: shellHeaderDataUiState = caseShellHeaderDataUiState({
		loading,
		hasActiveCaseMeta: !!$activeCaseMeta,
		loadError,
		loadUiState
	});

	function statusBadgeClass(status: string): string {
		switch (status?.toUpperCase()) {
			case 'OPEN':
				return 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400';
			case 'CLOSED':
				return 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400';
			case 'PENDING':
				return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
			default:
				return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
		}
	}
</script>

<!-- ═══════════════════════════════════════════════════════
     Case Workspace Shell
     All case routes render inside this single unified frame.
     ═══════════════════════════════════════════════════════ -->
<div
	class="flex flex-col flex-1 min-h-0 max-h-full w-full min-w-0 bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-100 overflow-hidden"
	data-testid="case-workspace-shell"
>
	<!-- ── TOP CASE HEADER — P70-04 identity bar (P71-03); primary tab strip is below (P71-04) ── -->
	<header
		class="ce-l-identity-bar shrink-0 z-10 flex flex-wrap items-center gap-x-2 gap-y-2 px-3 py-2.5 sm:min-h-12 sm:py-2"
		aria-label="Case identity"
		data-testid="case-identity-bar"
	>
		<button
			type="button"
			class="ce-l-identity-back shrink-0"
			on:click={() => goto('/cases')}
			aria-label="Back to cases"
		>
			<ChevronLeft className="size-4 shrink-0" />
			<span class="text-xs font-medium">Cases</span>
		</button>

		<div class="h-4 w-px shrink-0 bg-[color:var(--ce-l-border-default)]" aria-hidden="true"></div>

		{#if loading && !$activeCaseMeta}
			<span
				class="text-sm animate-pulse text-[color:var(--ce-l-text-muted)]"
				data-testid="case-shell-loading"
				data-case-engine-ui-state={shellHeaderDataUiState}
			>Loading…</span>
		{:else if loadError}
			<span
				class="text-sm text-red-500 dark:text-red-400"
				data-testid="case-shell-load-error"
				data-case-engine-ui-state={shellHeaderDataUiState}
			>
				{loadError}
			</span>
		{:else if $activeCaseMeta}
			<div
				class="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
				data-testid="case-shell-loaded"
				data-case-engine-ui-state={shellHeaderDataUiState}
			>
				<div
					class="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1.5"
				>
					<span
						class="shrink-0 select-all font-mono text-xs tabular-nums text-[color:var(--ce-l-text-muted)]"
					>
						{$activeCaseMeta.case_number}
					</span>

					{#if $activeCaseMeta.title}
						<span
							class="min-w-0 max-w-full flex-1 basis-[min(100%,12rem)] truncate text-sm font-semibold text-[color:var(--ce-l-text-primary)] sm:max-w-md md:max-w-xl"
							title={$activeCaseMeta.title}
						>
							{$activeCaseMeta.title}
						</span>
					{/if}

					{#if $activeCaseMeta.unit}
						<span class="ce-l-identity-meta-chip hidden sm:inline-flex">
							{$activeCaseMeta.unit}
						</span>
					{/if}

					{#if $activeCaseMeta.status}
						<span
							class="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium
							       {statusBadgeClass($activeCaseMeta.status)}"
						>
							{$activeCaseMeta.status}
						</span>
					{/if}

					{#if $activeCaseMeta.incident_date}
						<span
							class="hidden shrink-0 rounded px-1.5 py-0.5 text-xs font-medium md:inline-flex
							       bg-amber-50 text-amber-800 dark:bg-amber-900/35 dark:text-amber-200"
						>
							Incident: {$activeCaseMeta.incident_date}
						</span>
					{:else}
						<span
							class="hidden shrink-0 rounded px-1.5 py-0.5 text-xs font-medium md:inline-flex
							       bg-amber-50/90 text-amber-800/95 dark:bg-amber-900/25 dark:text-amber-200/95"
						>
							Incident date missing
						</span>
					{/if}
				</div>

				<button
					type="button"
					class="ce-l-identity-edit shrink-0 self-start sm:self-center"
					on:click={() => {
						if (!$activeCaseMeta) return;
						editCaseSeed = {
							id: $activeCaseMeta.id,
							case_number: $activeCaseMeta.case_number,
							title: $activeCaseMeta.title,
							unit: $activeCaseMeta.unit,
							status: $activeCaseMeta.status,
							incident_date: $activeCaseMeta.incident_date ?? null
						};
						showEditCaseModal = true;
					}}
				>
					Edit Case
				</button>
			</div>
		{/if}
	</header>

	<!-- ── PRIMARY CASE TAB STRIP — P70-05 / P71-04 (Intelligence sub-modes: P71-09) ── -->
	<nav
		class="ce-l-tab-strip shrink-0 z-[5]"
		bind:this={caseTabNavEl}
		aria-label="Case sections"
		data-testid="case-workspace-nav"
	>
		{#each caseNavItems as item}
			{#if item.implemented}
				<a
					href={`/case/${$page.params.id}/${item.id}`}
					class="ce-l-tab-link {activeSection === item.id ? 'ce-l-tab-link--active' : ''}"
					data-case-tab={item.id}
					aria-current={activeSection === item.id ? 'page' : undefined}
				>
					{item.label}
				</a>
			{:else}
				<span
					class="ce-l-tab-link ce-l-tab-link--disabled select-none"
					aria-disabled="true"
					data-section={item.id}
					data-case-tab={item.id}
				>
					{item.label}
				</span>
			{/if}
		{/each}
	</nav>

	<!-- ── BODY: main workspace + right rail ──────── -->
	<div class="flex flex-1 min-h-0 overflow-hidden">
		<!-- ── CENTER: main workspace + bottom composer ──────── -->
		<div class="flex flex-col flex-1 min-w-0 min-h-0">
			<!-- MAIN WORKSPACE SLOT
			     Overflow is managed by individual page/tab components so each
			     section can control its own scroll behavior. -->
			<div
				class="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden relative"
				data-testid="case-workspace-main"
			>
				{#if loading && !$activeCaseMeta}
					<div class="flex items-center justify-center h-full">
						<Spinner className="size-5" />
					</div>
				{:else if loadError}
					<div class="flex items-center justify-center h-full">
						<p class="text-sm text-red-500 dark:text-red-400">{loadError}</p>
					</div>
				{:else}
					<slot />
				{/if}
			</div>

	<!-- BOTTOM COMPOSER REGION
	     P19-08: Chat.svelte owns the composer input inside its own layout.
	     This structural placeholder collapses to zero height on all tabs. -->
	<div
		class="shrink-0 min-h-0"
		aria-label="Composer region"
		data-testid="case-composer-region"
		data-section={activeSection}
	></div>
		</div>

		<!-- ── RIGHT CONTEXT RAIL
		     Reserved for future context integration. Only rendered on chat tab
		     where right-side space is part of the intended workspace structure. ── -->
		{#if activeSection === 'chat'}
			<div
				class="hidden xl:flex w-56 shrink-0 flex-col border-l border-gray-200 dark:border-gray-800
				       bg-gray-50 dark:bg-gray-900"
				aria-label="Context rail"
				data-testid="case-context-rail"
			></div>
		{/if}
	</div>
</div>

<EditCaseModal
	show={showEditCaseModal}
	token={$caseEngineToken}
	caseData={editCaseSeed}
	on:close={() => {
		showEditCaseModal = false;
	}}
	on:saved={(event) => {
		const saved = event.detail.case as CaseEngineCase;
		activeCaseMeta.set({
			id: saved.id,
			case_number: String(saved.case_number ?? saved.id),
			title: String(saved.title ?? ''),
			unit: String(saved.unit ?? ''),
			status: String(saved.status ?? ''),
			incident_date:
				typeof saved.incident_date === 'string' && saved.incident_date.trim()
					? saved.incident_date
					: null
		});
		activeCaseNumber.set(String(saved.case_number ?? ''));
		editCaseSeed = saved;
		showEditCaseModal = false;
	}}
/>
