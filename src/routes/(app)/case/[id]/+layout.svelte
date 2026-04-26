<script lang="ts">
	/**
	 * P19-06 — Case Workspace Shell
	 * P82-02 — `CaseWorkspaceHeader` (identity + context strip + pending proposals link).
	 * P123-02 — `CaseWorkspaceCaseSidebar` remains for embedded use; primary case nav is the tab bar.
	 * P132.5-01 — `CaseWorkspaceLayoutShell` (center / optional right) + `CaseWorkspaceShellPanel` frames.
	 * P132.5-02 — Timeline route: primary center panel (`case-workspace-shell-timeline-panel`, delegated scroll).
	 * P132.5-03 — Right rail: `CaseWorkspaceRightPanelStack` (Activity / AI / Proposals; internal tabs only).
	 * P76-02 — Wave 3 `ds-case-shell*` frame + `data-region`.
	 * P76-08 — `caseModeActive` for GNAV / case shell coordination.
	 */
	import { onMount, onDestroy, tick } from 'svelte';
	import { get } from 'svelte/store';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { page as pageStore } from '$app/stores';

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
	import CaseWorkspaceLayoutShell from '$lib/components/case/CaseWorkspaceLayoutShell.svelte';
	import CaseWorkspaceShellPanel from '$lib/components/case/CaseWorkspaceShellPanel.svelte';
	import CaseWorkspaceRightPanelStack from '$lib/components/case/CaseWorkspaceRightPanelStack.svelte';
	import CaseWorkspaceHeader from '$lib/components/case/CaseWorkspaceHeader.svelte';
	import CaseWorkspaceCaseNavTabBar from '$lib/components/case/CaseWorkspaceCaseNavTabBar.svelte';
	import CaseExportPanel from '$lib/components/case/CaseExportPanel.svelte';
	import EditCaseModal from '$lib/components/case/EditCaseModal.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import { DS_CASE_SHELL_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import { P1325_RIGHT_STACK_PANEL_TITLE } from '$lib/caseContext/p1325CaseWorkspaceShellCopy';
	import { caseIdentityStripExpandedPosture } from '$lib/utils/caseIdentityStrip';
	import {
		isDetectiveWave3CaseShellEnabled,
		WAVE3_CASE_SHELL_LEGACY_ROOT_CLASS,
		WAVE3_CASE_SHELL_LEGACY_BODY_CLASS,
		WAVE3_CASE_SHELL_LEGACY_CANVAS_COLUMN_CLASS,
		WAVE3_CASE_SHELL_LEGACY_RAIL_CLASS,
		WAVE3_CASE_SHELL_GOVERNED_RAIL_CLASS
	} from '$lib/case/detectiveWave3CaseShell';
	import {
		buildCaseSynthesisReadModel,
		CASE_SYNTHESIS_READ_MODEL_DEV_LOG_LABEL
	} from '$lib/case/caseSynthesisReadModel';
	import { getRouteCaseId } from '$lib/caseContext/routeCaseContext';

	caseModeActive.set(true);

	let loading = true;
	let loadError = '';
	let showEditCaseModal = false;
	let showCaseExportModal = false;
	let editCaseSeed: CaseEngineCase | null = null;
	let loadUiState: CaseEngineUiState | null = null;
	let pendingProposalsShellCount: number | null = null;

	let prevCaseId: string = getRouteCaseId(page.params) ?? '';

	function mapCaseToMeta(c: CaseEngineCase) {
		const createdRaw = c.created_at;
		const created_at =
			typeof createdRaw === 'string' && createdRaw.trim() ? createdRaw : null;
		const updatedRaw = (c as { updated_at?: unknown }).updated_at;
		const updated_at =
			typeof updatedRaw === 'string' && updatedRaw.trim() ? updatedRaw : null;
		return {
			id: c.id as string,
			case_number: (c.case_number ?? c.id) as string,
			title: (c.title ?? '') as string,
			unit: (c.unit ?? '') as string,
			status: (c.status ?? '') as string,
			incident_date:
				typeof c.incident_date === 'string' && c.incident_date.trim()
					? c.incident_date
					: null,
			created_at,
			updated_at
		};
	}

	async function loadCaseMeta(caseId: string): Promise<void> {
		const rid = getRouteCaseId({ id: caseId });
		if (!rid) {
			loading = false;
			loadError = '';
			loadUiState = 'idle';
			activeCaseMeta.set(null);
			pendingProposalsShellCount = null;
			return;
		}
		loading = true;
		loadError = '';
		loadUiState = 'loading';
		activeCaseMeta.set(null);
		pendingProposalsShellCount = null;
		try {
			const c = await getCaseById(rid, $caseEngineToken!);
			activeCaseMeta.set(mapCaseToMeta(c));
			activeCaseId.set(c.id as string);
			activeCaseNumber.set((c.case_number ?? null) as string | null);
			loadUiState = 'success';
			try {
				const pr = await listProposalsPaginated(rid, $caseEngineToken!, 'pending', {
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
		if ($caseEngineAuthState) {
			const decision = resolveAuthStateDecision($caseEngineAuthState.state);
			const redirectTo = blockedRedirectPath(decision);
			if (redirectTo) {
				caseModeActive.set(false);
				await goto(redirectTo);
				return;
			}
		}

		if (!$caseEngineToken) {
			caseModeActive.set(false);
			await goto('/cases');
			return;
		}

		const rid = getRouteCaseId(page.params);
		if (!rid) {
			loading = false;
			loadUiState = 'idle';
			loadError = '';
			return;
		}
		await loadCaseMeta(rid);
	});

	onDestroy(() => {
		caseModeActive.set(false);
		activeCaseMeta.set(null);
	});

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
		const unsub = pageStore.subscribe(() => schedule());
		return () => unsub();
	});

	/** P96-01: dev-only console inspection — `?p96_synthesis=1` on case workspace (read-only contract). */
	onMount(() => {
		if (!browser || import.meta.env.PROD) return;
		let lastDevLogKey = '';
		const unsub = pageStore.subscribe(($p) => {
			if ($p.url.searchParams.get('p96_synthesis') !== '1') return;
			const id = getRouteCaseId($p.params);
			const token = get(caseEngineToken);
			if (!id || !token) return;
			const key = `${id}:${$p.url.search}:tok=${token ? 'y' : 'n'}`;
			if (key === lastDevLogKey) return;
			lastDevLogKey = key;
			void buildCaseSynthesisReadModel(id, token, { includeFileExtractedText: false })
				.then((m) => console.info(CASE_SYNTHESIS_READ_MODEL_DEV_LOG_LABEL, m))
				.catch((e) => console.warn(CASE_SYNTHESIS_READ_MODEL_DEV_LOG_LABEL, e));
		});
		return () => unsub();
	});

	$: {
		const rid = getRouteCaseId(page.params);
		if (rid && $caseEngineToken && rid !== prevCaseId) {
			prevCaseId = rid;
			loadCaseMeta(rid);
		}
	}

	$: routeCaseId = getRouteCaseId(page.params);

	$: activeSection = resolveActiveCaseSection(page.url.pathname);

	$: shellHeaderDataUiState = caseShellHeaderDataUiState({
		loading,
		hasActiveCaseMeta: !!$activeCaseMeta,
		loadError,
		loadUiState
	});

	$: identityStripExpanded = caseIdentityStripExpandedPosture(activeSection);

	$: wave3CaseShellEnabled = isDetectiveWave3CaseShellEnabled();
	$: caseShellRootClass = wave3CaseShellEnabled ? DS_CASE_SHELL_CLASSES.root : WAVE3_CASE_SHELL_LEGACY_ROOT_CLASS;
	$: caseShellBodyClass = wave3CaseShellEnabled ? DS_CASE_SHELL_CLASSES.body : WAVE3_CASE_SHELL_LEGACY_BODY_CLASS;
	$: caseShellCanvasColumnClass = wave3CaseShellEnabled
		? DS_CASE_SHELL_CLASSES.canvasColumn
		: WAVE3_CASE_SHELL_LEGACY_CANVAS_COLUMN_CLASS;
	$: contextRailClass = wave3CaseShellEnabled ? WAVE3_CASE_SHELL_GOVERNED_RAIL_CLASS : WAVE3_CASE_SHELL_LEGACY_RAIL_CLASS;

	function closeCaseExportModal(): void {
		showCaseExportModal = false;
	}

	function openEditCaseModal(): void {
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
	}
</script>

<svelte:window
	on:keydown={(e) => {
		if (e.key !== 'Escape' || !showCaseExportModal) return;
		closeCaseExportModal();
	}}
/>

<div
	class={caseShellRootClass}
	data-testid="case-workspace-shell"
	data-case-shell-wave3={wave3CaseShellEnabled ? 'on' : 'off'}
	data-region={wave3CaseShellEnabled ? 'case-shell-root' : undefined}
>
	<div
		class="case-shell-occ-root ds-occ-root ds-surface flex min-h-0 min-w-0 flex-1 flex-col"
		data-region="case-shell-occ-root"
		data-testid="case-shell-occ-root"
	>
		<div
			class="case-shell-occ-dashboard ds-occ-dashboard-surface flex min-h-0 min-w-0 flex-1 flex-col"
			data-region="case-shell-occ-dashboard"
			data-testid="case-shell-occ-dashboard-surface"
		>
			<CaseWorkspaceHeader
				caseId={routeCaseId ?? ''}
				{loading}
				{loadError}
				meta={$activeCaseMeta}
				shellHeaderDataUiState={shellHeaderDataUiState}
				{identityStripExpanded}
				{wave3CaseShellEnabled}
				{pendingProposalsShellCount}
				occSheetEmbedded={true}
				occHeroBannerStack={true}
				exportCaseEnabled={!!(
					$activeCaseMeta &&
					$caseEngineToken &&
					routeCaseId &&
					activeSection !== 'summary'
				)}
				onExportCase={() => (showCaseExportModal = true)}
				onEdit={openEditCaseModal}
			/>

			{#if routeCaseId}
				<CaseWorkspaceCaseNavTabBar caseId={routeCaseId} occSheetEmbedded={true} />
			{/if}

			<div
				class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
				data-testid="case-shell-occ-body-scroll"
			>
			<!--
				Hide the shell right rail (Case Activity & Tools) on every case route.
				It duplicated Activity / AI / Proposals beside primary surfaces (Notes, Files, …)
				and could appear stuck after client navigations. Use the dedicated tabs instead.
			-->
			<CaseWorkspaceLayoutShell hideRightRail={true}>
		<svelte:fragment slot="center">
			<div class={caseShellBodyClass} data-region={wave3CaseShellEnabled ? 'case-shell-body' : undefined}>
				<div
					class={caseShellCanvasColumnClass}
					data-region={wave3CaseShellEnabled ? 'case-shell-canvas-column' : undefined}
				>
					<div
						class="relative flex min-h-0 min-w-0 flex-1 flex-col {activeSection === 'summary'
							? 'overflow-x-hidden overflow-y-auto min-h-0'
							: 'overflow-hidden'}"
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
							{#if activeSection === 'timeline'}
								<!-- No shell title: Timeline page already owns the primary “Timeline” heading. -->
								<CaseWorkspaceShellPanel
									testId="case-workspace-shell-timeline-panel"
									delegateBodyScroll={true}
								>
									<slot />
								</CaseWorkspaceShellPanel>
							{:else}
								<slot />
							{/if}
						{/if}
					</div>

					<div
						class="shrink-0 min-h-0"
						aria-label="Composer region"
						data-testid="case-composer-region"
						data-region={wave3CaseShellEnabled ? 'case-shell-composer' : undefined}
						data-section={activeSection}
					></div>
				</div>

				{#if activeSection === 'chat'}
					<div
						class="{contextRailClass} {DS_CASE_SHELL_CLASSES.rail}"
						aria-label="Context rail"
						data-testid="case-context-rail"
						data-region={wave3CaseShellEnabled ? 'case-shell-rail' : undefined}
					></div>
				{/if}
			</div>
		</svelte:fragment>

		<svelte:fragment slot="right">
			<CaseWorkspaceShellPanel
				testId="case-workspace-shell-right-panel"
				title={P1325_RIGHT_STACK_PANEL_TITLE}
				delegateBodyScroll={true}
			>
				<CaseWorkspaceRightPanelStack caseId={routeCaseId ?? ''} />
			</CaseWorkspaceShellPanel>
		</svelte:fragment>
	</CaseWorkspaceLayoutShell>
			</div>
		</div>
	</div>
</div>

{#if showCaseExportModal && routeCaseId && $caseEngineToken}
	<div
		class="fixed inset-0 z-[150] flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[min(8rem,10vh)] sm:pt-12"
		role="presentation"
		data-testid="case-export-launch-backdrop"
		on:click={(e) => e.target === e.currentTarget && closeCaseExportModal()}
	>
		<div
			class="w-full max-w-lg rounded-[var(--ds-radius-lg)] border border-[color:var(--ds-border-default)] bg-[color:var(--ds-bg-elevated)] shadow-xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="case-export-launch-title"
			data-testid="case-export-launch-dialog"
			on:click|stopPropagation
		>
			<div
				class="flex items-center justify-between gap-2 border-b border-[color:var(--ce-l-border-subtle)] px-3 py-2"
			>
				<h2
					id="case-export-launch-title"
					class="m-0 text-sm font-semibold text-[color:var(--ce-l-text-primary)]"
				>
					Export
				</h2>
				<button
					type="button"
					class="ds-btn ds-btn-ghost min-h-0 rounded px-2 py-1 text-sm"
					aria-label="Close export dialog"
					data-testid="case-export-launch-close"
					on:click={closeCaseExportModal}
				>
					×
				</button>
			</div>
			<div class="max-h-[min(70vh,28rem)] overflow-y-auto p-3">
				<CaseExportPanel caseId={routeCaseId} token={$caseEngineToken} inDialog={true} />
			</div>
		</div>
	</div>
{/if}

<EditCaseModal
	show={showEditCaseModal}
	token={$caseEngineToken}
	caseData={editCaseSeed}
	on:close={() => {
		showEditCaseModal = false;
	}}
	on:saved={(event) => {
		const saved = event.detail.case as CaseEngineCase;
		activeCaseMeta.set(mapCaseToMeta(saved));
		activeCaseNumber.set(String(saved.case_number ?? ''));
		editCaseSeed = saved;
		showEditCaseModal = false;
	}}
/>
