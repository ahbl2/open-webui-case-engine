<script lang="ts">
	/**
	 * P19-06 — Case Workspace Shell
	 *
	 * This layout establishes the case-native workspace that replaces the generic
	 * Open WebUI shell for all /case/[id]/* routes.  It is responsible for:
	 *   - Suppressing the global sidebar (via caseModeActive)
	 *   - Loading and exposing case metadata to child routes
	 *   - Rendering the structural shell regions:
	 *       - top case header
	 *       - left case navigation
	 *       - main workspace slot
	 *       - right context rail (structural — P19-08+)
	 *       - bottom composer region (structural — P19-08)
	 *   - Enforcing P19-05 access gating before any case content renders
	 */
	import { onMount, onDestroy } from 'svelte';
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
	import { listCases } from '$lib/apis/caseEngine';
	import { resolveAuthStateDecision, blockedRedirectPath } from '$lib/utils/authStateDecision';
	import { resolveActiveCaseSection } from '$lib/utils/caseNavSection';
	import ChevronLeft from '$lib/components/icons/ChevronLeft.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';

	// Suppress the global Open WebUI sidebar immediately — synchronous, before
	// the first render, so there is no frame where both shells are visible.
	caseModeActive.set(true);

	let loading = true;
	let loadError = '';

	// Prevent double-loading on the reactive block below by seeding prevCaseId
	// with the current route param before the reactive statement first evaluates.
	let prevCaseId: string = $page.params.id ?? '';

	async function loadCaseMeta(caseId: string): Promise<void> {
		loading = true;
		loadError = '';
		activeCaseMeta.set(null);
		try {
			const cases = await listCases('ALL', $caseEngineToken!);
			const c = cases.find((x: Record<string, unknown>) => x.id === caseId);
			if (!c) {
				loadError = 'Case not found or access denied.';
				return;
			}
			activeCaseMeta.set({
				id: c.id as string,
				case_number: (c.case_number ?? c.id) as string,
				title: (c.title ?? '') as string,
				unit: (c.unit ?? '') as string,
				status: (c.status ?? '') as string
			});
			activeCaseId.set(c.id as string);
			activeCaseNumber.set((c.case_number ?? null) as string | null);
		} catch (e: unknown) {
			loadError = e instanceof Error ? e.message : 'Failed to load case.';
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
	// Timeline remains pending (not yet migrated).
	const caseNavItems: Array<{ id: string; label: string; implemented: boolean }> = [
		{ id: 'chat',     label: 'Chat',     implemented: true  },
		{ id: 'timeline', label: 'Timeline', implemented: false },
		{ id: 'files',    label: 'Files',    implemented: true  },
		{ id: 'notes',    label: 'Notes',    implemented: true  },
		{ id: 'activity', label: 'Activity', implemented: true  }
	];

	$: activeSection = resolveActiveCaseSection($page.url.pathname);

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
	class="flex flex-col h-screen max-h-[100dvh] bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-100 overflow-hidden"
	data-testid="case-workspace-shell"
>
	<!-- ── TOP CASE HEADER ─────────────────────────────────── -->
	<header
		class="shrink-0 flex items-center gap-3 h-11 px-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 z-10"
	>
		<button
			type="button"
			class="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400
			       hover:text-gray-700 dark:hover:text-gray-200 transition shrink-0
			       py-1 px-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
			on:click={() => goto('/cases')}
			aria-label="Back to cases"
		>
			<ChevronLeft className="size-4" />
			<span class="text-xs font-medium">Cases</span>
		</button>

		<div class="w-px h-4 bg-gray-200 dark:bg-gray-700 shrink-0"></div>

		{#if loading && !$activeCaseMeta}
			<span class="text-sm text-gray-400 animate-pulse">Loading…</span>
		{:else if loadError}
			<span class="text-sm text-red-500">{loadError}</span>
		{:else if $activeCaseMeta}
			<div class="flex items-center gap-2 min-w-0 overflow-hidden">
				<span
					class="font-mono text-xs text-gray-400 dark:text-gray-500 shrink-0 select-all"
				>
					{$activeCaseMeta.case_number}
				</span>

				{#if $activeCaseMeta.title}
					<span class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
						{$activeCaseMeta.title}
					</span>
				{/if}

				{#if $activeCaseMeta.unit}
					<span
						class="shrink-0 text-xs font-medium px-1.5 py-0.5 rounded
						       bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
					>
						{$activeCaseMeta.unit}
					</span>
				{/if}

				{#if $activeCaseMeta.status}
					<span
						class="shrink-0 text-xs font-medium px-1.5 py-0.5 rounded
						       {statusBadgeClass($activeCaseMeta.status)}"
					>
						{$activeCaseMeta.status}
					</span>
				{/if}
			</div>
		{/if}
	</header>

	<!-- ── BODY: left nav + main workspace + right rail ──────── -->
	<div class="flex flex-1 min-h-0 overflow-hidden">
		<!-- ── LEFT CASE NAVIGATION ──────────────────────────── -->
		<nav
			class="w-44 shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-800
			       bg-gray-50 dark:bg-gray-900 pt-2 pb-4 overflow-y-auto"
			aria-label="Case workspace sections"
			data-testid="case-workspace-nav"
		>
			{#each caseNavItems as item}
				{#if item.implemented}
					<!-- Implemented section: clickable link with active-state indicator -->
					<a
						href={`/case/${$page.params.id}/${item.id}`}
						class="group flex items-center gap-2.5 mx-2 px-3 py-2 rounded-md text-sm transition-colors
						       {activeSection === item.id
							? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium shadow-sm'
							: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200'}"
						aria-current={activeSection === item.id ? 'page' : undefined}
					>
						<span
							class="shrink-0 w-1.5 h-1.5 rounded-full transition-colors
							       {activeSection === item.id
								? 'bg-blue-500'
								: 'bg-gray-200 dark:bg-gray-700 group-hover:bg-gray-400 dark:group-hover:bg-gray-500'}"
						></span>
						<span>{item.label}</span>
					</a>
				{:else}
					<!-- Not-yet-migrated section: non-interactive, clearly distinct from Chat.
					     Will become a real link when its migration ticket (P19-08/P19-14) ships. -->
					<span
						class="flex items-center gap-2.5 mx-2 px-3 py-2 rounded-md text-sm
						       text-gray-300 dark:text-gray-600 cursor-not-allowed select-none"
						aria-disabled="true"
						data-section={item.id}
					>
						<span class="shrink-0 w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700"></span>
						<span>{item.label}</span>
					</span>
				{/if}
			{/each}
		</nav>

		<!-- ── CENTER: main workspace + bottom composer ──────── -->
		<div class="flex flex-col flex-1 min-w-0 min-h-0">
			<!-- MAIN WORKSPACE SLOT
			     Overflow is managed by individual page/tab components so each
			     section can control its own scroll behavior. -->
			<div class="flex-1 min-h-0 overflow-hidden relative" data-testid="case-workspace-main">
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
		     P19-08: When the chat section is active, Chat.svelte owns the composer
		     input at the bottom of its own layout. The structural placeholder here
		     collapses to zero height to avoid double-composing the input zone.
		     For non-chat sections (Timeline, Files, etc.) this region may be used
		     by P19-14+ for a section-appropriate action bar. -->
		<div
			class="shrink-0 {activeSection === 'chat' ? 'min-h-0' : 'border-t border-gray-200 dark:border-gray-800 min-h-[2.5rem]'}"
			aria-label="Composer region"
			data-testid="case-composer-region"
			data-section={activeSection}
		></div>
		</div>

		<!-- ── RIGHT CONTEXT RAIL
		     Structural shell region reserved for P19-08+ context integration.
		     Hidden below xl breakpoint.  Do not populate until P19-08+. ── -->
		<div
			class="hidden xl:flex w-56 shrink-0 flex-col border-l border-gray-200 dark:border-gray-800
			       bg-gray-50 dark:bg-gray-900"
			aria-label="Context rail"
			data-testid="case-context-rail"
		></div>
	</div>
</div>
