<script lang="ts">
	/**
	 * P19-06 — Case Workspace Shell
	 * P71-03 — Identity bar uses Tier L tokens / P70-04.
	 * P71-04 — Primary tab strip uses Tier L tokens / P70-05 (horizontal scroll, ce-l-tab-*).
	 * P76-02 — Wave 3: DS `ds-case-shell*` frame + `data-region` map to CASE_WORKSPACE_SHELL_SPEC / FRONTEND_APPLICATION_ARCHITECTURE
	 *   shell hierarchy; single owner — no parallel wrapper. P73-02: this file owns the outer flex + overflow-hidden chain;
	 *   tab routes own inner scrollports (e.g. `.ce-l-content-region`, route-specific `data-testid` scroll roots).
	 * P76-03 — `PUBLIC_DETECTIVE_WAVE3_CASE_SHELL` (see `detectiveWave3CaseShell.ts`): off = legacy root/body/canvas/rail classes, no `data-region`;
	 *   independent of Wave 2 `PUBLIC_DETECTIVE_WAVE2_APP_SHELL`.
	 * P76-04 — Identity strip: CASE_WORKSPACE_SHELL_SPEC §Case identity doctrine + §Shell context compression;
	 *   helpers in `caseIdentityStrip.ts`. Priority / lead detective: not in Case Engine `CaseMeta` — not displayed (see phase tracker).
	 * P76-05 — Primary case tab strip: CASE_WORKSPACE_SHELL_SPEC §Tab / navigation doctrine; governed order/labels + segment-based
	 *   active state (`caseNavSection.ts`); Wave 3 DS polish via `.ds-case-shell[data-case-shell-wave3="on"]` + `detectiveSurfaces.css`.
	 * P76-06 — Optional shell context band under tabs (`DS_CASE_SHELL_CLASSES.contextBand`): pending proposals link when
	 *   `listProposalsPaginated` totals show pending > 0; no fake metrics. Chat rail: `DS_CASE_SHELL_CLASSES.rail` framing only.
	 * P76-07 — All `/case/[id]/*` tab pages use `CaseWorkspaceContentRegion` (`.ce-l-content-region`) as the bounded canvas
	 *   under `case-workspace-main`; shell chrome stays in this file only (P73-02 scroll chain).
	 * P76-08 — App shell ↔ case shell: Wave 2 app GNAV remains the program navigator (`resolveDetectiveGnavPrimaryActive`:
	 * `/case/*` → GNAV “Cases”); this layout owns case identity + primary tab strip only. `caseModeActive` is set
	 * synchronously below so refresh/deep-link never flash duplicate global + case navigation. `PUBLIC_DETECTIVE_WAVE3_CASE_SHELL`
	 * only toggles DS case-frame tokens here — independent of Wave 2 `PUBLIC_DETECTIVE_WAVE2_APP_SHELL`.
	 *
	 * This layout establishes the case-native workspace for all /case/[id]/* routes.
	 *   - Loading and exposing case metadata to child routes
	 *   - Regions: case identity (header), case tab strip (nav), page workspace (slot), optional composer strip, optional shell rail
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
	import { getCaseById, listProposalsPaginated } from '$lib/apis/caseEngine';
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
	import {
		DS_BADGE_CLASSES,
		DS_CASE_SHELL_CLASSES,
		DS_CHIP_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import {
		caseIdentityStripExpandedPosture,
		caseStatusDsBadgeCompound,
		displayCaseTitle
	} from '$lib/utils/caseIdentityStrip';
	import {
		isDetectiveWave3CaseShellEnabled,
		WAVE3_CASE_SHELL_LEGACY_ROOT_CLASS,
		WAVE3_CASE_SHELL_LEGACY_BODY_CLASS,
		WAVE3_CASE_SHELL_LEGACY_CANVAS_COLUMN_CLASS,
		WAVE3_CASE_SHELL_LEGACY_RAIL_CLASS,
		WAVE3_CASE_SHELL_GOVERNED_RAIL_CLASS
	} from '$lib/case/detectiveWave3CaseShell';

	// P76-08 — Suppress the global OWUI sidebar immediately (sync, incl. first paint on refresh/deep-link)
	// so there is no frame where app chrome + case workspace both show competing nav. Cleared in onDestroy / gated redirects.
	caseModeActive.set(true);

	let loading = true;
	let loadError = '';
	let showEditCaseModal = false;
	let editCaseSeed: CaseEngineCase | null = null;
	/** P20-PRE-04: classified failure for case shell load (never silent / never fake success). */
	let loadUiState: CaseEngineUiState | null = null;

	/** P76-06 — Pending proposal count for optional shell band (null = unavailable / not loaded / error). */
	let pendingProposalsShellCount: number | null = null;

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
		pendingProposalsShellCount = null;
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
			try {
				const pr = await listProposalsPaginated(caseId, $caseEngineToken!, 'pending', {
					limit: 1,
					offset: 0
				});
				pendingProposalsShellCount = pr.totalsByStatus.pending;
			} catch {
				pendingProposalsShellCount = null;
			}
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
	// P76-05 — Order/labels align to CASE_WORKSPACE_SHELL_SPEC §approved primary case tabs where routes exist; `summary` → "Overview";
	//   `chat` → "AI workspace"; Warrants/Graph are runtime supplements (not in spec table) — see phase tracker.
	const caseNavItems: Array<{ id: string; label: string; implemented: boolean }> = [
		{ id: 'summary', label: 'Overview', implemented: true },
		{ id: 'timeline', label: 'Timeline', implemented: true },
		{ id: 'files', label: 'Files & evidence', implemented: true },
		{ id: 'intelligence', label: 'Entity intelligence', implemented: true },
		{ id: 'workflow', label: 'Workflow & leads', implemented: true },
		{ id: 'activity', label: 'Activity / audit', implemented: true },
		{ id: 'chat', label: 'AI workspace', implemented: true },
		{ id: 'notes', label: 'Notes', implemented: true },
		{ id: 'proposals', label: 'Proposals', implemented: true },
		{ id: 'warrants', label: 'Warrants', implemented: true },
		{ id: 'graph', label: 'Graph', implemented: true }
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

	/** P76-04 — Expanded identity on Summary tab (spec: expanded hero on overview-like entry). */
	$: identityStripExpanded = caseIdentityStripExpandedPosture(activeSection);

	/** P76-03 — Wave 3 case shell strangler: governed DS frame vs legacy pre–P76-02 root (no partial hybrid). */
	$: wave3CaseShellEnabled = isDetectiveWave3CaseShellEnabled();
	$: caseShellRootClass = wave3CaseShellEnabled ? DS_CASE_SHELL_CLASSES.root : WAVE3_CASE_SHELL_LEGACY_ROOT_CLASS;
	$: caseShellBodyClass = wave3CaseShellEnabled ? DS_CASE_SHELL_CLASSES.body : WAVE3_CASE_SHELL_LEGACY_BODY_CLASS;
	$: caseShellCanvasColumnClass = wave3CaseShellEnabled
		? DS_CASE_SHELL_CLASSES.canvasColumn
		: WAVE3_CASE_SHELL_LEGACY_CANVAS_COLUMN_CLASS;
	$: contextRailClass = wave3CaseShellEnabled ? WAVE3_CASE_SHELL_GOVERNED_RAIL_CLASS : WAVE3_CASE_SHELL_LEGACY_RAIL_CLASS;
</script>

<!-- ═══════════════════════════════════════════════════════
     Case Workspace Shell — CASE_WORKSPACE_SHELL_SPEC §Shell structure
     All case routes render inside this single unified frame (Wave 2 app shell main → this root).
     ═══════════════════════════════════════════════════════ -->
<div
	class={caseShellRootClass}
	data-testid="case-workspace-shell"
	data-case-shell-wave3={wave3CaseShellEnabled ? 'on' : 'off'}
	data-region={wave3CaseShellEnabled ? 'case-shell-root' : undefined}
>
	<!--
		Case identity strip — CASE_WORKSPACE_SHELL_SPEC §Case identity doctrine.
		Primary: case number + title; secondary: unit chip, status badge, incident meta. No priority/lead in CaseMeta (P76-04 tracker).
	-->
	<header
		class="ce-l-identity-bar shrink-0 z-10 flex flex-wrap items-start gap-x-2 gap-y-2 px-3 sm:items-center {identityStripExpanded
			? 'py-3 sm:min-h-[3.5rem]'
			: 'py-2.5 sm:min-h-12 sm:py-2'}"
		aria-label="Case identity"
		data-testid="case-identity-bar"
		data-case-identity-posture={identityStripExpanded ? 'expanded' : 'compact'}
		data-region={wave3CaseShellEnabled ? 'case-shell-identity' : undefined}
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
				<div class="flex min-w-0 flex-1 flex-col gap-2 {identityStripExpanded ? 'sm:gap-2.5' : 'gap-1.5'}">
					<div
						class="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1"
						data-testid="case-identity-primary"
					>
						<span
							class="{DS_TYPE_CLASSES.mono} shrink-0 select-all text-xs tabular-nums text-[color:var(--ce-l-text-muted)]"
						>
							{$activeCaseMeta.case_number}
						</span>
						<h1
							class="{DS_TYPE_CLASSES.body} min-w-0 max-w-full flex-1 basis-[min(100%,14rem)] truncate font-semibold leading-snug text-[color:var(--ce-l-text-primary)] sm:max-w-xl md:max-w-2xl {identityStripExpanded
								? 'text-base sm:text-lg'
								: 'text-sm sm:text-base'}"
							title={displayCaseTitle($activeCaseMeta.title)}
						>
							{displayCaseTitle($activeCaseMeta.title)}
						</h1>
					</div>
					<div
						class="flex flex-wrap items-center gap-2"
						data-testid="case-identity-secondary"
						aria-label="Case metadata"
					>
						{#if $activeCaseMeta.unit?.trim()}
							<span
								class="{DS_CHIP_CLASSES.base} max-w-[14rem] truncate"
								title={$activeCaseMeta.unit}
							>
								{$activeCaseMeta.unit}
							</span>
						{/if}
						{#if $activeCaseMeta.status?.trim()}
							<span class={caseStatusDsBadgeCompound($activeCaseMeta.status)}>
								{$activeCaseMeta.status}
							</span>
						{:else}
							<span class="{DS_BADGE_CLASSES.base} {DS_BADGE_CLASSES.neutral}">No status</span>
						{/if}
						{#if $activeCaseMeta.incident_date}
							<span class="{DS_TYPE_CLASSES.meta} text-[color:var(--ce-l-text-secondary)]">
								Incident {$activeCaseMeta.incident_date}
							</span>
						{:else}
							<span class="{DS_TYPE_CLASSES.meta} text-[color:var(--ce-l-text-muted)]">No incident date</span>
						{/if}
					</div>
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

	<!-- Primary case tab navigation chrome — single owner for in-case tools (spec: no app-level duplicate strip) -->
	<nav
		class="ce-l-tab-strip shrink-0 z-[5]"
		bind:this={caseTabNavEl}
		aria-label="Case sections"
		data-testid="case-workspace-nav"
		data-region={wave3CaseShellEnabled ? 'case-shell-tabs' : undefined}
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

	<!--
		P76-06 — CASE_WORKSPACE_SHELL_SPEC §Case-level quick actions / indicators (optional thin band).
		Renders only when Case Engine returns pending proposal totals > 0; links to Proposals tab (honest signal, not page duplication).
	-->
	{#if $activeCaseMeta && !loadError && !loading && pendingProposalsShellCount !== null && pendingProposalsShellCount > 0}
		<div
			class="{DS_CASE_SHELL_CLASSES.contextBand} shrink-0"
			role="region"
			aria-label="Case signals"
			data-testid="case-shell-context-band"
			data-region={wave3CaseShellEnabled ? 'case-shell-context-band' : undefined}
		>
			<a
				href={`/case/${$page.params.id}/proposals`}
				class="inline-flex max-w-full min-w-0 items-center gap-2 rounded-md px-1 py-0.5 text-[color:var(--ce-l-text-primary)] outline-none ring-offset-2 transition-colors hover:bg-[color:var(--ce-l-surface-muted)] focus-visible:ring-2 focus-visible:ring-[color:var(--ce-l-tab-active-border)]"
				data-testid="case-shell-context-band-pending-proposals"
			>
				<span class="{DS_BADGE_CLASSES.warning} tabular-nums">{pendingProposalsShellCount}</span>
				<span class="{DS_TYPE_CLASSES.meta} text-[color:var(--ce-l-text-secondary)]">Pending proposals</span>
			</a>
		</div>
	{/if}

	<!-- Page workspace region: canvas column + optional shell rail (P73-02: shell bounds height; pages scroll inside) -->
	<div class={caseShellBodyClass} data-region={wave3CaseShellEnabled ? 'case-shell-body' : undefined}>
		<div class={caseShellCanvasColumnClass} data-region={wave3CaseShellEnabled ? 'case-shell-canvas-column' : undefined}>
			<!--
				Main workspace slot — FRONTEND_APPLICATION_ARCHITECTURE §Page-local workspace.
				Shell keeps overflow-hidden here so flex min-h-0 propagates; each tab page supplies
				.ce-l-content-region or route scroll roots for bounded scrolling (see caseWorkspaceScrollDiagnostics).
			-->
			<div
				class="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden relative"
				data-testid="case-workspace-main"
				data-region={wave3CaseShellEnabled ? 'case-shell-page' : undefined}
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

			<!-- Bounded shell strip for composer; Chat embeds composer in-page — placeholder stays min-h-0 when empty -->
			<div
				class="shrink-0 min-h-0"
				aria-label="Composer region"
				data-testid="case-composer-region"
				data-region={wave3CaseShellEnabled ? 'case-shell-composer' : undefined}
				data-section={activeSection}
			></div>
		</div>

		<!-- Optional shell-level rail (spec default: page-owned rails; chat reserves xl column for future context) -->
		{#if activeSection === 'chat'}
			<div
				class="{contextRailClass} {DS_CASE_SHELL_CLASSES.rail}"
				aria-label="Context rail"
				data-testid="case-context-rail"
				data-region={wave3CaseShellEnabled ? 'case-shell-rail' : undefined}
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
