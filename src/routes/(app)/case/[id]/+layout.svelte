<script lang="ts">
	/**
	 * P19-06 — Case Workspace Shell
	 * P82-02 — `CaseWorkspaceHeader` (identity + context strip + pending proposals link).
	 * P123-02 — `CaseWorkspaceCaseSidebar` (list + Phase 123 surface links).
	 * P132.5-01 — `CaseWorkspaceLayoutShell` (left / center / right) + `CaseWorkspaceShellPanel` frames.
	 * P76-02 — Wave 3 `ds-case-shell*` frame + `data-region`.
	 * P76-08 — `caseModeActive` for GNAV / case shell coordination.
	 */
	import { onMount, onDestroy, tick } from 'svelte';
	import { get } from 'svelte/store';
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
	import CaseWorkspaceLayoutShell from '$lib/components/case/CaseWorkspaceLayoutShell.svelte';
	import CaseWorkspaceShellPanel from '$lib/components/case/CaseWorkspaceShellPanel.svelte';
	import CaseWorkspaceCaseSidebar from '$lib/components/case/CaseWorkspaceCaseSidebar.svelte';
	import CaseWorkspaceHeader from '$lib/components/case/CaseWorkspaceHeader.svelte';
	import CaseExportPanel from '$lib/components/case/CaseExportPanel.svelte';
	import EditCaseModal from '$lib/components/case/EditCaseModal.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import { DS_CASE_SHELL_CLASSES, DS_TYPE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import {
		P1325_SHELL_LEFT_ZONE_TITLE,
		P1325_SHELL_RIGHT_ZONE_TITLE,
		P1325_SHELL_RIGHT_ZONE_PLACEHOLDER
	} from '$lib/caseContext/p1325CaseWorkspaceShellCopy';
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
	let editCaseSeed: CaseEngineCase | null = null;
	let loadUiState: CaseEngineUiState | null = null;
	let pendingProposalsShellCount: number | null = null;

	let prevCaseId: string = getRouteCaseId($page.params) ?? '';

	function mapCaseToMeta(c: CaseEngineCase) {
		const createdRaw = c.created_at;
		const created_at =
			typeof createdRaw === 'string' && createdRaw.trim() ? createdRaw : null;
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
			created_at
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

		const rid = getRouteCaseId($page.params);
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
		const unsub = page.subscribe(() => schedule());
		return () => unsub();
	});

	/** P96-01: dev-only console inspection — `?p96_synthesis=1` on case workspace (read-only contract). */
	onMount(() => {
		if (!browser || import.meta.env.PROD) return;
		let lastDevLogKey = '';
		const unsub = page.subscribe(($p) => {
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
		const rid = getRouteCaseId($page.params);
		if (rid && $caseEngineToken && rid !== prevCaseId) {
			prevCaseId = rid;
			loadCaseMeta(rid);
		}
	}

	$: routeCaseId = getRouteCaseId($page.params);

	$: activeSection = resolveActiveCaseSection($page.url.pathname);

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

<div
	class={caseShellRootClass}
	data-testid="case-workspace-shell"
	data-case-shell-wave3={wave3CaseShellEnabled ? 'on' : 'off'}
	data-region={wave3CaseShellEnabled ? 'case-shell-root' : undefined}
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
		onEdit={openEditCaseModal}
	/>

	<CaseWorkspaceLayoutShell>
		<svelte:fragment slot="left">
			<CaseWorkspaceShellPanel testId="case-workspace-shell-left-panel" title={P1325_SHELL_LEFT_ZONE_TITLE}>
				<CaseWorkspaceCaseSidebar />
			</CaseWorkspaceShellPanel>
		</svelte:fragment>

		<svelte:fragment slot="center">
			<div class={caseShellBodyClass} data-region={wave3CaseShellEnabled ? 'case-shell-body' : undefined}>
				<div
					class={caseShellCanvasColumnClass}
					data-region={wave3CaseShellEnabled ? 'case-shell-canvas-column' : undefined}
				>
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
							{#if $activeCaseMeta && $caseEngineToken && routeCaseId}
								<CaseExportPanel caseId={routeCaseId} token={$caseEngineToken} />
							{/if}
							<slot />
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
			<CaseWorkspaceShellPanel testId="case-workspace-shell-right-panel" title={P1325_SHELL_RIGHT_ZONE_TITLE}>
				<p class="{DS_TYPE_CLASSES.body} m-0 text-xs text-[color:var(--ce-l-text-muted)]">
					{P1325_SHELL_RIGHT_ZONE_PLACEHOLDER}
				</p>
			</CaseWorkspaceShellPanel>
		</svelte:fragment>
	</CaseWorkspaceLayoutShell>
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
		activeCaseMeta.set(mapCaseToMeta(saved));
		activeCaseNumber.set(String(saved.case_number ?? ''));
		editCaseSeed = saved;
		showEditCaseModal = false;
	}}
/>
